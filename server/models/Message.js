import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const messageSchema = new mongoose.Schema({
  messageId: { type: String, default: uuidv4, unique: true, index: true },
  conversationId: { type: String, required: true },
  sender: { type: String, required: true },
  type: { type: String, default: 'text' },
  content: { type: String, default: null },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileSize: { type: Number, default: null },
  storageKey: { type: String, default: null },
  readBy: { type: [{ _id: false, user: String, readAt: String }], default: [] },
  deliveredTo: { type: [String], default: [] },
  deletedFor: { type: [String], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false });

messageSchema.index({ conversationId: 1, createdAt: -1 });

const MessageModel = mongoose.model('Message', messageSchema);

const toPlain = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject();
  delete obj._id;
  return obj;
};

// Accepts the legacy `s3Key` field name from older callers/clients.
const normalizeInput = (data) => {
  const { s3Key, ...rest } = data;
  if (s3Key && !rest.storageKey) rest.storageKey = s3Key;
  return rest;
};

export class Message {
  static async create(data) {
    return toPlain(await MessageModel.create(normalizeInput(data)));
  }

  static async findById(messageId) {
    return toPlain(await MessageModel.findOne({ messageId }));
  }

  static async findByConversation(conversationId, limit = null) {
    let query = MessageModel.find({ conversationId }).sort({ createdAt: -1 });
    if (limit) query = query.limit(limit);
    return (await query).map(toPlain);
  }

  /**
   * The newest `limit` messages visible to `viewerId`, returned oldest-first for
   * display. `before` (an ISO timestamp) pages back through older history.
   */
  static async findRecent(conversationId, viewerId, limit = 50, before = null) {
    const query = { conversationId, deletedFor: { $ne: viewerId } };
    if (before) query.createdAt = { $lt: before };
    const docs = await MessageModel.find(query).sort({ createdAt: -1 }).limit(limit + 1);
    const hasMore = docs.length > limit;
    return { messages: docs.slice(0, limit).reverse().map(toPlain), hasMore };
  }

  static async findManyByIds(messageIds) {
    const ids = (messageIds || []).filter(Boolean);
    if (!ids.length) return new Map();
    const docs = await MessageModel.find({ messageId: { $in: ids } });
    return new Map(docs.map(d => [d.messageId, toPlain(d)]));
  }

  static async countByConversationAndUser(conversationId, userId) {
    return MessageModel.countDocuments({
      conversationId,
      sender: { $ne: userId },
      deletedFor: { $ne: userId },
      'readBy.user': { $ne: userId }
    });
  }

  static async update(messageId, updates) {
    const doc = await MessageModel.findOneAndUpdate(
      { messageId },
      { $set: { ...normalizeInput(updates), updatedAt: new Date().toISOString() } },
      { new: true }
    );
    if (!doc) throw new Error('Message not found');
    return toPlain(doc);
  }

  static async save(message) {
    const { messageId, ...rest } = message;
    return this.update(messageId, rest);
  }

  static async markAsRead(messageId, userId) {
    const doc = await MessageModel.findOneAndUpdate(
      { messageId, sender: { $ne: userId }, 'readBy.user': { $ne: userId } },
      {
        $push: { readBy: { user: userId, readAt: new Date().toISOString() } },
        $addToSet: { deliveredTo: userId },
        $set: { updatedAt: new Date().toISOString() }
      },
      { new: true }
    );
    return toPlain(doc) || this.findById(messageId);
  }

  /**
   * Records that `userId`'s device received these messages. Only messages that
   * weren't already marked are touched, and those are returned so the caller can
   * tell each sender exactly what changed.
   */
  static async markDelivered(messageIds, userId, allowedConversationIds) {
    if (!messageIds?.length) return [];
    const query = { messageId: { $in: messageIds }, sender: { $ne: userId }, deliveredTo: { $ne: userId } };
    // Restrict to conversations the user belongs to, so nobody can stamp
    // themselves onto messages in conversations they aren't part of.
    if (allowedConversationIds) query.conversationId = { $in: [...allowedConversationIds] };
    const pending = await MessageModel.find(
      query,
      { messageId: 1, conversationId: 1, sender: 1 }
    );
    if (!pending.length) return [];
    await MessageModel.updateMany(
      { messageId: { $in: pending.map(m => m.messageId) } },
      { $addToSet: { deliveredTo: userId } }
    );
    return pending.map(m => ({ messageId: m.messageId, conversationId: m.conversationId, sender: m.sender }));
  }

  /** Messages addressed to `userId` in these conversations that never reached them. */
  static async findUndelivered(conversationIds, userId) {
    if (!conversationIds?.length) return [];
    const docs = await MessageModel.find(
      { conversationId: { $in: conversationIds }, sender: { $ne: userId }, deliveredTo: { $ne: userId } },
      { messageId: 1 }
    );
    return docs.map(d => d.messageId);
  }

  /**
   * Marks every unread incoming message in a conversation as read (and therefore
   * delivered) for `userId`. Returns the messages that changed.
   */
  static async markConversationRead(conversationId, userId) {
    const unread = await MessageModel.find(
      { conversationId, sender: { $ne: userId }, 'readBy.user': { $ne: userId } },
      { messageId: 1, conversationId: 1, sender: 1 }
    );
    if (!unread.length) return [];
    const readAt = new Date().toISOString();
    await MessageModel.updateMany(
      { messageId: { $in: unread.map(m => m.messageId) } },
      { $push: { readBy: { user: userId, readAt } }, $addToSet: { deliveredTo: userId } }
    );
    return unread.map(m => ({ messageId: m.messageId, conversationId: m.conversationId, sender: m.sender, readAt }));
  }

  static async deleteMany(filter) {
    const q = {};
    if (filter.conversation) q.conversationId = filter.conversation;
    if (filter.conversationId) q.conversationId = filter.conversationId;
    if (filter.messageId) q.messageId = filter.messageId;
    const result = await MessageModel.deleteMany(q);
    return { deletedCount: result.deletedCount };
  }

  static async updateMany(filter, updates) {
    const q = {};
    if (filter.conversation) q.conversationId = filter.conversation;
    if (filter.conversationId) q.conversationId = filter.conversationId;
    const result = await MessageModel.updateMany(q, updates);
    return { modifiedCount: result.modifiedCount };
  }

  static async countDocuments(filter) {
    const q = {};
    if (filter.conversation) q.conversationId = filter.conversation;
    if (filter.sender) q.sender = filter.sender;
    if (filter['readBy.user']) q['readBy.user'] = filter['readBy.user'];
    if (filter.deletedFor) q.deletedFor = filter.deletedFor;
    return MessageModel.countDocuments(q);
  }

  static async populate(message, field) {
    if (field === 'sender' && message.sender) {
      const User = (await import('./User.js')).default;
      const sender = await User.findById(message.sender);
      return { ...message, sender };
    }
    return message;
  }
}

export default Message;
