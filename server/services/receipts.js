import Message from '../models/Message.js';
import User from '../models/User.js';
import { emitToUser } from './socketRegistry.js';
import { receiptsEnabled } from './privacy.js';

// Groups changed messages by sender and conversation so each sender gets one
// event per conversation rather than one per message.
const groupBySender = (changed) => {
  const groups = new Map();
  for (const m of changed) {
    const key = `${m.sender}|${m.conversationId}`;
    if (!groups.has(key)) groups.set(key, { sender: m.sender, conversationId: m.conversationId, messageIds: [] });
    groups.get(key).messageIds.push(m.messageId);
  }
  return [...groups.values()];
};

/** Tells each sender that `recipientId`'s device received their messages. */
export const notifyDelivered = (changed, recipientId) => {
  const at = new Date().toISOString();
  for (const g of groupBySender(changed)) {
    emitToUser(g.sender, 'message:status', {
      conversationId: g.conversationId,
      messageIds: g.messageIds,
      status: 'delivered',
      userId: recipientId,
      at,
    });
  }
};

/**
 * Marks a conversation read for `userId`, tells the senders, and syncs the
 * user's other open tabs so their unread badges clear too.
 */
export const readConversation = async (conversationId, userId) => {
  const changed = await Message.markConversationRead(conversationId, userId);
  await notifyRead(changed, userId);
  emitToUser(userId, 'conversation:read', { conversationId });
  return changed.length;
};

/**
 * Tells senders their messages were read — unless the reader or the sender has
 * read receipts turned off. Delivery is still reported either way, because read
 * implies delivered and delivery isn't covered by the read-receipt setting.
 */
export const notifyRead = async (changed, readerId) => {
  if (!changed.length) return;
  const groups = groupBySender(changed);
  const users = await User.findManyByIds([readerId, ...groups.map(g => g.sender)]);
  const readerShares = receiptsEnabled(users.get(String(readerId)));
  const at = changed[0].readAt || new Date().toISOString();

  for (const g of groups) {
    const status = readerShares && receiptsEnabled(users.get(String(g.sender))) ? 'read' : 'delivered';
    emitToUser(g.sender, 'message:status', {
      conversationId: g.conversationId,
      messageIds: g.messageIds,
      status,
      userId: readerId,
      at,
    });
  }
};
