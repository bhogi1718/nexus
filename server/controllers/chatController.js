import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { uploadFile, downloadFile as downloadFromStorage, deleteFile, resourceTypeFor } from '../services/cloudinaryStorage.js';
import { sanitizeMessage } from '../services/sanitizationService.js';
import { visiblePresence, visibleReadBy } from '../services/privacy.js';
import { notifyRead, readConversation } from '../services/receipts.js';
import { emitToUser } from '../services/socketRegistry.js';

// --- formatting --------------------------------------------------------------

// What the client gets about another user, with presence filtered through both
// users' privacy settings.
const formatUser = (user, viewer) => user ? {
  _id: user.userId,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  status: user.status,
  // Public identity key, shown in safety numbers.
  identityKeyDh: user.identityKeyDh || null,
  ...visiblePresence(user, viewer),
} : null;

const formatSender = (user) => user ? { _id: user.userId, name: user.name, avatar: user.avatar } : null;

const formatMessage = (message, viewerId, usersById) => message ? {
  _id: message.messageId,
  conversation: message.conversationId,
  sender: formatSender(usersById.get(message.sender)) || { _id: message.sender },
  type: message.type,
  content: message.content,
  fileUrl: message.fileUrl,
  fileName: message.fileName,
  fileSize: message.fileSize,
  storageKey: message.storageKey,
  s3Key: message.storageKey,
  readBy: visibleReadBy(message.readBy, viewerId, usersById),
  deliveredTo: message.deliveredTo || [],
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
} : null;

const formatConversation = (conversation, viewerId, usersById, lastMessage) => ({
  _id: conversation.conversationId,
  type: conversation.type,
  name: conversation.name,
  avatar: conversation.avatar,
  participants: conversation.participants
    .map(id => formatUser(usersById.get(id), usersById.get(viewerId)))
    .filter(Boolean),
  admin: conversation.admin,
  lastMessage: lastMessage && !(lastMessage.deletedFor || []).includes(viewerId)
    ? formatMessage(lastMessage, viewerId, usersById)
    : null,
  lastMessageAt: conversation.lastMessageAt,
  createdBy: conversation.createdBy,
  createdAt: conversation.createdAt,
});

const isParticipant = (conversation, userId) =>
  Boolean(conversation?.participants?.includes(userId));

/** One conversation, fully populated for `viewerId`. */
const loadConversationView = async (conversation, viewerId) => {
  const lastMessages = await Message.findManyByIds([conversation.lastMessage]);
  const lastMessage = lastMessages.get(conversation.lastMessage);
  const usersById = await User.findManyByIds([...conversation.participants, lastMessage?.sender]);
  return formatConversation(conversation, viewerId, usersById, lastMessage);
};

const sendError = (res, error, label) => {
  console.error(`${label}:`, error);
  res.status(500).json({ message: 'Server error' });
};

// --- conversations -----------------------------------------------------------

export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.userId;

    if (typeof userId !== 'string' || !userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    if (currentUserId === userId) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let conversation = await Conversation.findOne({
      type: 'private',
      participants: { $all: [currentUserId, userId] },
    });

    if (!conversation) {
      // New conversations can only be started with someone in your contacts.
      const me = await User.findById(currentUserId);
      if (!(me.contacts || []).includes(userId)) {
        return res.status(403).json({ message: 'Add this user to your contacts first' });
      }
      conversation = await Conversation.create({
        type: 'private',
        participants: [currentUserId, userId],
        createdBy: currentUserId,
      });
    } else if ((conversation.deletedFor || []).includes(currentUserId)) {
      conversation = await Conversation.update(conversation.conversationId, {
        deletedFor: conversation.deletedFor.filter(id => id !== currentUserId),
      });
    }

    res.status(200).json({ conversation: await loadConversationView(conversation, currentUserId) });
  } catch (error) {
    sendError(res, error, 'Get or create conversation error');
  }
};

export const getConversations = async (req, res) => {
  try {
    const viewerId = req.userId;
    const conversations = await Conversation.find({
      participants: viewerId,
      deletedFor: { $ne: viewerId },
    });

    // Three batched queries instead of several per conversation.
    const lastMessages = await Message.findManyByIds(conversations.map(c => c.lastMessage));
    const userIds = new Set();
    conversations.forEach(c => c.participants.forEach(p => userIds.add(p)));
    lastMessages.forEach(m => userIds.add(m.sender));
    const usersById = await User.findManyByIds([...userIds]);
    const unreadCounts = await Promise.all(
      conversations.map(c => Message.countByConversationAndUser(c.conversationId, viewerId))
    );

    const result = conversations.map((c, i) => ({
      ...formatConversation(c, viewerId, usersById, lastMessages.get(c.lastMessage)),
      unreadCount: unreadCounts[i],
    }));

    res.status(200).json({ conversations: result });
  } catch (error) {
    sendError(res, error, 'Get conversations error');
  }
};

export const getConversationDetails = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !isParticipant(conversation, req.userId)) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.status(200).json({ conversation: await loadConversationView(conversation, req.userId) });
  } catch (error) {
    sendError(res, error, 'Get conversation details error');
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !isParticipant(conversation, req.userId)) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const updated = await readConversation(conversationId, req.userId);
    res.status(200).json({ message: 'Conversation marked as read', updated });
  } catch (error) {
    sendError(res, error, 'Mark conversation read error');
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !isParticipant(conversation, userId)) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const deletedFor = [...new Set([...(conversation.deletedFor || []), userId])];
    await Conversation.update(conversationId, { deletedFor });
    await Message.updateMany({ conversation: conversationId }, { $addToSet: { deletedFor: userId } });

    // Once every participant has deleted it, nobody can see it: remove it entirely.
    if (conversation.participants.every(p => deletedFor.includes(p))) {
      const messages = await Message.findByConversation(conversationId);
      for (const msg of messages.filter(m => m.storageKey)) {
        try {
          await deleteFile(msg.storageKey, resourceTypeFor(getMimeType(msg.fileName || '')));
        } catch (storageErr) {
          console.error('Failed to delete stored file:', msg.storageKey, storageErr.message);
        }
      }
      await Message.deleteMany({ conversation: conversationId });
      await Conversation.findByIdAndDelete(conversationId);
    }

    res.status(200).json({ message: 'Conversation deleted for you' });
  } catch (error) {
    sendError(res, error, 'Delete conversation error');
  }
};

// --- messages ----------------------------------------------------------------

const MAX_PAGE = 200;

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const viewerId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !isParticipant(conversation, viewerId)
      || (conversation.deletedFor || []).includes(viewerId)) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), MAX_PAGE);
    const before = typeof req.query.before === 'string' ? req.query.before : null;

    // Newest messages first from the database, returned oldest-first for display.
    const { messages, hasMore } = await Message.findRecent(conversationId, viewerId, limit, before);
    const usersById = await User.findManyByIds(conversation.participants);

    res.status(200).json({
      messages: messages.map(m => formatMessage(m, viewerId, usersById)),
      hasMore,
    });
  } catch (error) {
    sendError(res, error, 'Get messages error');
  }
};

// REST fallback for clients without a socket connection.
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !isParticipant(conversation, req.userId)) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const message = await Message.create({
      conversationId,
      sender: req.userId,
      type: 'text',
      content: sanitizeMessage(content),
    });

    await Conversation.update(conversationId, {
      lastMessage: message.messageId,
      lastMessageAt: message.createdAt,
      deletedFor: [],
    });

    const usersById = await User.findManyByIds(conversation.participants);
    const formatted = formatMessage(message, req.userId, usersById);
    conversation.participants.forEach(p => emitToUser(p, 'conversation:notify', formatted));

    res.status(201).json({ message: formatted });
  } catch (error) {
    sendError(res, error, 'Send message error');
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !isParticipant(conversation, req.userId)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const alreadyRead = (message.readBy || []).some(r => r.user === req.userId);
    const updated = await Message.markAsRead(messageId, req.userId);

    if (!alreadyRead && message.sender !== req.userId) {
      await notifyRead([{
        messageId,
        conversationId: message.conversationId,
        sender: message.sender,
      }], req.userId);
    }

    const usersById = await User.findManyByIds(conversation.participants);
    res.status(200).json({ message: formatMessage(updated, req.userId, usersById) });
  } catch (error) {
    sendError(res, error, 'Mark as read error');
  }
};

// "Delete for me": hides the message from the requester only.
export const deleteMessageForMe = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !isParticipant(conversation, req.userId)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const deletedFor = [...new Set([...(message.deletedFor || []), req.userId])];
    await Message.update(message.messageId, { deletedFor });
    res.status(200).json({ message: 'Message deleted for you' });
  } catch (error) {
    sendError(res, error, 'Delete message error');
  }
};

// --- people ------------------------------------------------------------------

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (typeof query !== 'string' || query.length < 2 || query.length > 100) {
      return res.status(400).json({ message: 'Search query must be between 2 and 100 characters' });
    }

    const queryLower = query.toLowerCase();
    const me = await User.findById(req.userId);
    const contacts = await User.findManyByIds(me.contacts || []);

    const users = [...contacts.values()]
      .filter(u =>
        (u.name && u.name.toLowerCase().includes(queryLower)) ||
        (u.email && u.email.toLowerCase().includes(queryLower)))
      .slice(0, 10)
      .map(u => formatUser(u, me));

    res.status(200).json({ users });
  } catch (error) {
    sendError(res, error, 'Search users error');
  }
};

/**
 * Another user's profile. Visible only to someone who has them as a contact or
 * shares a conversation with them; everyone else gets the same 404 as a
 * nonexistent user, so profiles can't be probed by id.
 */
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.userId;

    const [viewer, target] = await Promise.all([User.findById(viewerId), User.findById(userId)]);
    if (!viewer || !target) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isSelf = viewerId === userId;
    const isContact = (viewer.contacts || []).includes(userId);
    const shared = isSelf ? null : await Conversation.findOne({
      type: 'private',
      participants: { $all: [viewerId, userId] },
    });

    if (!isSelf && !isContact && !shared) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        ...formatUser(target, viewer),
        isContact,
        nickname: viewer.contactNicknames?.[userId] || null,
        conversationId: shared && !(shared.deletedFor || []).includes(viewerId) ? shared.conversationId : null,
        memberSince: target.createdAt,
      },
    });
  } catch (error) {
    sendError(res, error, 'Get user profile error');
  }
};

export const addContact = async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const contactUser = await User.findByEmail(email.toLowerCase().trim());
    if (!contactUser) {
      return res.status(404).json({ message: 'No user found with that email' });
    }
    if (contactUser.userId === req.userId) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    const me = await User.findById(req.userId);
    if ((me.contacts || []).includes(contactUser.userId)) {
      return res.status(400).json({ message: 'Already in your contacts' });
    }

    await User.addContact(req.userId, contactUser.userId);
    res.status(200).json({ message: 'Contact added', contact: formatUser(contactUser, me) });
  } catch (error) {
    sendError(res, error, 'Add contact error');
  }
};

export const getContacts = async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    if (!me) {
      return res.status(404).json({ message: 'User not found' });
    }

    const contactsById = await User.findManyByIds(me.contacts || []);
    const contacts = (me.contacts || [])
      .map(id => contactsById.get(id))
      .filter(Boolean)
      .map(c => ({ ...formatUser(c, me), nickname: me.contactNicknames?.[c.userId] || null }))
      .sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name));

    res.status(200).json({ contacts });
  } catch (error) {
    sendError(res, error, 'Get contacts error');
  }
};

export const setContactNickname = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { nickname } = req.body;

    const me = await User.findById(req.userId);
    if (!(me.contacts || []).includes(contactId)) {
      return res.status(400).json({ message: 'Not in your contacts' });
    }

    const trimmed = (typeof nickname === 'string' ? nickname : '').trim();
    if (trimmed.length > 50) {
      return res.status(400).json({ message: 'Nickname too long (max 50 characters)' });
    }

    await User.setContactNickname(req.userId, contactId, trimmed ? sanitizeMessage(trimmed) : null);
    res.status(200).json({ message: 'Nickname updated', nickname: trimmed || null });
  } catch (error) {
    sendError(res, error, 'Set nickname error');
  }
};

export const removeContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const me = await User.findById(req.userId);
    if (!(me.contacts || []).includes(contactId)) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    await User.removeContact(req.userId, contactId);
    res.status(200).json({ message: 'Contact removed' });
  } catch (error) {
    sendError(res, error, 'Remove contact error');
  }
};

// --- media -------------------------------------------------------------------

export const uploadMedia = async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !isParticipant(conversation, req.userId)) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const uploadResult = await uploadFile(req.file.buffer, req.file.originalname, conversationId, req.file.mimetype);

    res.status(200).json({
      url: uploadResult.url,
      fileName: req.file.originalname,
      fileSize: uploadResult.size,
      storageKey: uploadResult.key,
      s3Key: uploadResult.key,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed. Please try again.' });
  }
};

const MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const getMimeType = (fileName) => MIME_TYPES[fileName.toLowerCase().split('.').pop()] || 'application/octet-stream';

export const downloadFile = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message || !message.fileUrl) {
      return res.status(404).json({ message: 'File not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !isParticipant(conversation, req.userId)) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (!message.storageKey) {
      return res.status(400).json({ message: 'File not available in storage' });
    }

    const mimeType = getMimeType(message.fileName || '');
    const buffer = await downloadFromStorage(message.storageKey, resourceTypeFor(mimeType));
    if (buffer.length === 0) {
      return res.status(400).json({ message: 'File is empty' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(message.fileName)}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Length', buffer.length);
    res.type(mimeType);
    res.send(buffer);
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to download file' });
    }
  }
};
