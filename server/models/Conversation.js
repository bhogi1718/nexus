import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, default: uuidv4, unique: true, index: true },
  type: { type: String, enum: ['private', 'group'], default: 'private' },
  name: { type: String, default: null },
  avatar: { type: String, default: null },
  participants: { type: [String], default: [], index: true },
  admin: { type: String, default: null },
  lastMessage: { type: String, default: null },
  lastMessageAt: { type: String, default: () => new Date().toISOString() },
  createdBy: { type: String, default: null },
  deletedFor: { type: [String], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false });

const ConversationModel = mongoose.model('Conversation', conversationSchema);

const toPlain = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject();
  delete obj._id;
  return obj;
};

export class Conversation {
  static async create(data) {
    return toPlain(await ConversationModel.create(data));
  }

  static async findById(conversationId) {
    return toPlain(await ConversationModel.findOne({ conversationId }));
  }

  static async findOne(filter) {
    if (filter.type === 'private' && filter.participants?.$all) {
      const doc = await ConversationModel.findOne({
        type: 'private',
        participants: { $all: filter.participants.$all, $size: 2 }
      });
      return toPlain(doc);
    }
    return toPlain(await ConversationModel.findOne(filter));
  }

  static async find(filter) {
    const docs = await ConversationModel.find(filter).sort({ lastMessageAt: -1 });
    return docs.map(toPlain);
  }

  static async update(conversationId, updates) {
    const doc = await ConversationModel.findOneAndUpdate(
      { conversationId },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { new: true }
    );
    return toPlain(doc);
  }

  static async findByIdAndUpdate(conversationId, updates) {
    return this.update(conversationId, updates);
  }

  static async save(conversation) {
    const { conversationId, ...rest } = conversation;
    return this.update(conversationId, rest);
  }

  static async findByIdAndDelete(conversationId) {
    await ConversationModel.deleteOne({ conversationId });
    return true;
  }

  static async populate(conversation, fields) {
    if (fields?.includes('participants')) {
      const User = (await import('./User.js')).default;
      const participants = await Promise.all(
        conversation.participants.map(async (id) => {
          const user = await User.findById(id);
          return user ? {
            _id: user.userId,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            status: user.status
          } : null;
        })
      );
      conversation.participants = participants.filter(Boolean);
    }

    if (fields?.includes('lastMessage') && conversation.lastMessage) {
      const Message = (await import('./Message.js')).default;
      conversation.lastMessage = await Message.findById(conversation.lastMessage);
    }

    return conversation;
  }
}

export default Conversation;
