import { v4 as uuidv4 } from 'uuid';
import db, { TABLES } from '../services/dynamodb.js';

export class Conversation {
  static async create(data) {
    const conversation = {
      conversationId: data.conversationId || uuidv4(),
      type: data.type || 'private',
      name: data.name || null,
      avatar: data.avatar || null,
      participants: data.participants || [],
      admin: data.admin || null,
      lastMessage: data.lastMessage || null,
      lastMessageAt: data.lastMessageAt || new Date().toISOString(),
      createdBy: data.createdBy || null,
      deletedFor: data.deletedFor || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await db.put(TABLES.CONVERSATIONS, conversation);
  }

  static async findById(conversationId) {
    return await db.get(TABLES.CONVERSATIONS, { conversationId });
  }

  static async findOne(filter) {
    // Find conversation where participants match
    if (filter.type === 'private' && filter.participants && filter.participants.$all) {
      const [user1, user2] = filter.participants.$all;
      const conversations = await db.scan(TABLES.CONVERSATIONS);

      return conversations.find(c =>
        c.type === 'private' &&
        c.participants.length === 2 &&
        c.participants.includes(user1) &&
        c.participants.includes(user2)
      ) || null;
    }

    return null;
  }

  static async find(filter) {
    const conversations = await db.scan(TABLES.CONVERSATIONS);

    return conversations.filter(c => {
      if (filter.participants && !c.participants.includes(filter.participants)) return false;
      if (filter.deletedFor && filter.deletedFor.$ne) {
        if (c.deletedFor && c.deletedFor.includes(filter.deletedFor.$ne)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  }

  static async findByIdAndUpdate(conversationId, updates) {
    return await db.update(TABLES.CONVERSATIONS, { conversationId }, updates);
  }

  static async update(conversationId, updates) {
    return await db.update(TABLES.CONVERSATIONS, { conversationId }, updates);
  }

  static async save(conversation) {
    conversation.updatedAt = new Date().toISOString();
    return await db.put(TABLES.CONVERSATIONS, conversation);
  }

  static async findByIdAndDelete(conversationId) {
    await db.delete(TABLES.CONVERSATIONS, { conversationId });
    return true;
  }

  static async populate(conversation, fields) {
    // Populate participants and lastMessage
    if (fields && fields.includes('participants')) {
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

    if (fields && fields.includes('lastMessage') && conversation.lastMessage) {
      const Message = (await import('./Message.js')).default;
      conversation.lastMessage = await Message.findById(conversation.lastMessage);
    }

    return conversation;
  }
}

export default Conversation;
