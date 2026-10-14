import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { sanitizeMessage } from './sanitizationService.js';
import { verifyAccessToken } from './tokenService.js';
import { addConnection, removeConnection, emitToUser } from './socketRegistry.js';
import { lastSeenEnabled } from './privacy.js';
import { notifyDelivered, readConversation } from './receipts.js';

// --- rate limiting -----------------------------------------------------------

const buckets = new Map();

const isRateLimited = (userId, event, limit, windowMs) => {
  const key = `${userId}:${event}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count++;
  return bucket.count > limit;
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

// --- presence ----------------------------------------------------------------

// People who would display this user: anyone sharing a conversation with them
// or holding them as a contact. Presence goes only to these users, never to
// every connected client.
const audienceFor = async (userId) => {
  const [conversations, contactOf] = await Promise.all([
    Conversation.findForUser(userId),
    User.findIdsWithContact(userId),
  ]);
  const ids = new Set(contactOf);
  for (const c of conversations) c.participants.forEach(p => ids.add(p));
  ids.delete(userId);
  return [...ids];
};

const broadcastPresence = async (userId, event, payload) => {
  const audienceIds = await audienceFor(userId);
  const users = await User.findManyByIds([userId, ...audienceIds]);
  if (!lastSeenEnabled(users.get(userId))) return;
  for (const id of audienceIds) {
    // Reciprocal: someone who hides their own last seen doesn't see others'.
    if (lastSeenEnabled(users.get(id))) emitToUser(id, event, payload);
  }
};

// --- attachment validation ---------------------------------------------------

const MESSAGE_TYPES = new Set(['text', 'image', 'video', 'voice', 'document']);

// The attachment URL is sent back by the client after upload, so it must be
// checked: anything else (javascript:, a tracking pixel, another host) would be
// rendered as a link or image on the recipient's screen.
const isTrustedFileUrl = (url) => {
  if (typeof url !== 'string' || url.length > 2048) return false;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return Boolean(cloud) && url.startsWith(`https://res.cloudinary.com/${cloud}/`);
};

// --- message serialisation ---------------------------------------------------

const toWire = (message, sender, clientId) => {
  const wire = {
    _id: message.messageId,
    messageId: message.messageId,
    clientId: clientId || undefined,
    conversation: message.conversationId,
    conversationId: message.conversationId,
    sender: sender
      ? { _id: sender.userId, userId: sender.userId, name: sender.name, avatar: sender.avatar }
      : { _id: message.sender, userId: message.sender },
    content: message.content,
    type: message.type,
    createdAt: message.createdAt,
    deliveredTo: message.deliveredTo || [],
    readBy: [],
    deletedFor: [],
  };
  if (message.fileUrl) {
    wire.fileUrl = message.fileUrl;
    wire.fileName = message.fileName;
    wire.fileSize = message.fileSize;
    wire.storageKey = message.storageKey;
    wire.s3Key = message.storageKey;
  }
  return wire;
};

// --- registration ------------------------------------------------------------

export const registerRealtime = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token required'));
      socket.userId = verifyAccessToken(token).userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    // Counted synchronously, before any await, so a disconnect that arrives
    // during setup can't leave the count unbalanced.
    const cameOnline = addConnection(userId);

    // Membership is cached per connection and checked in memory, instead of a
    // database round trip on every typing event.
    const memberOf = new Set();
    const isMember = async (conversationId) => {
      // Socket payloads are untrusted JSON: an object here would become a Mongo
      // query operator (e.g. {"$ne": null}).
      if (typeof conversationId !== 'string' || !conversationId) return false;
      if (memberOf.has(conversationId)) return true;
      const conversation = await Conversation.findById(conversationId);
      if (conversation?.participants.includes(userId)) {
        memberOf.add(conversationId);
        return true;
      }
      return false;
    };

    // Handlers are attached below, synchronously; this setup runs alongside so
    // events sent the moment the socket connects aren't dropped.
    (async () => {
      try {
        const conversations = await Conversation.findForUser(userId);
        conversations.forEach(c => memberOf.add(c.conversationId));

        if (cameOnline) await broadcastPresence(userId, 'user:online', { userId });

        // Anything sent while this user was offline has now reached their device.
        const pending = await Message.findUndelivered([...memberOf], userId);
        const changed = await Message.markDelivered(pending, userId, memberOf);
        notifyDelivered(changed, userId);
      } catch (err) {
        console.error('Connection setup failed:', err.message);
      }
    })();

    socket.on('conversation:join', async (conversationId) => {
      try {
        if (!(await isMember(conversationId))) {
          socket.emit('error', { message: 'Unauthorized to join this conversation' });
          return;
        }
        socket.join(`conversation:${conversationId}`);
      } catch (err) {
        console.error('conversation:join failed:', err.message);
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('message:send', async (data = {}, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      try {
        if (isRateLimited(userId, 'message:send', 60, 60000)) {
          reply({ success: false, error: 'You are sending messages too quickly. Please wait a moment.' });
          return;
        }

        const { conversationId, content, fileUrl, fileName, fileSize, type, clientId } = data;
        if (!conversationId || typeof content !== 'string' || !content.trim()) {
          reply({ success: false, error: 'Conversation and message content are required' });
          return;
        }
        if (!(await isMember(conversationId))) {
          reply({ success: false, error: 'Not authorized to send messages in this conversation' });
          return;
        }

        if (fileUrl && !isTrustedFileUrl(fileUrl)) {
          reply({ success: false, error: 'Attachment was not uploaded through Nexus' });
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        const storageKey = data.storageKey || data.s3Key;
        const attachment = fileUrl ? {
          fileUrl,
          fileName: sanitizeMessage(String(fileName || 'file')).slice(0, 255),
          fileSize: Number.isFinite(Number(fileSize)) ? Number(fileSize) : null,
          storageKey: typeof storageKey === 'string' ? storageKey.slice(0, 512) : null,
        } : null;

        // deliveredTo starts empty: delivery is confirmed by the recipient's device.
        const message = await Message.create({
          conversationId,
          sender: userId, // always the authenticated user, never client-supplied
          type: MESSAGE_TYPES.has(type) ? type : 'text',
          content: sanitizeMessage(content),
          ...attachment,
        });

        // A new message brings a deleted chat back for everyone, as in WhatsApp;
        // the deleted history stays hidden because those messages carry deletedFor.
        await Conversation.update(conversationId, {
          lastMessage: message.messageId,
          lastMessageAt: message.createdAt,
          deletedFor: [],
        });

        const sender = await User.findById(userId);
        const wire = toWire(message, sender, typeof clientId === 'string' ? clientId.slice(0, 64) : undefined);

        reply({ success: true, messageId: message.messageId, createdAt: message.createdAt });

        io.to(`conversation:${conversationId}`).emit('message:receive', wire);
        // Every participant's personal room, the sender included, so their other
        // tabs and the conversation list stay in sync.
        conversation.participants.forEach(p => emitToUser(p, 'conversation:notify', wire));
      } catch (err) {
        console.error('message:send failed:', err.message);
        reply({ success: false, error: 'Failed to send message' });
      }
    });

    // The recipient's client confirms which messages reached the device.
    socket.on('message:delivered', async (payload = {}) => {
      try {
        if (isRateLimited(userId, 'message:delivered', 300, 60000)) return;
        const ids = Array.isArray(payload.messageIds) ? payload.messageIds.slice(0, 200).map(String) : [];
        // A chat created after this socket connected isn't cached yet; check it
        // now, or receipts for it would be dropped.
        const messages = await Message.findManyByIds(ids);
        for (const id of new Set([...messages.values()].map(m => m.conversationId))) {
          if (!memberOf.has(id)) await isMember(id);
        }
        const changed = await Message.markDelivered(ids, userId, memberOf);
        notifyDelivered(changed, userId);
      } catch (err) {
        console.error('message:delivered failed:', err.message);
      }
    });

    socket.on('conversation:read', async (conversationId) => {
      try {
        if (isRateLimited(userId, 'conversation:read', 120, 60000)) return;
        if (!(await isMember(conversationId))) return;
        await readConversation(conversationId, userId);
      } catch (err) {
        console.error('conversation:read failed:', err.message);
      }
    });

    const relayTyping = (event) => async (conversationId) => {
      if (isRateLimited(userId, event, 120, 60000)) return;
      if (!(await isMember(conversationId))) return;
      socket.to(`conversation:${conversationId}`).emit(event, { userId, conversationId });
    };
    socket.on('typing:start', relayTyping('typing:start'));
    socket.on('typing:stop', relayTyping('typing:stop'));

    socket.on('disconnect', async () => {
      if (!removeConnection(userId)) return;
      try {
        const lastSeen = new Date().toISOString();
        await User.update(userId, { lastSeen });
        await broadcastPresence(userId, 'user:offline', { userId, lastSeen });
      } catch (err) {
        console.error('Disconnect handling failed:', err.message);
      }
    });
  });
};
