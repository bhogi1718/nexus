import { v4 as uuidv4 } from 'uuid';
import db, { TABLES } from '../services/dynamodb.js';

export class Message {
  static async create(data) {
    const message = {
      messageId: data.messageId || uuidv4(),
      conversationId: data.conversationId,
      sender: data.sender,
      type: data.type || 'text',
      content: data.content || null,
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      s3Key: data.s3Key || null,
      readBy: data.readBy || [],
      deliveredTo: data.deliveredTo || [],
      deletedFor: data.deletedFor || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await db.put(TABLES.MESSAGES, message);
  }

  static async findById(messageId) {
    return await db.get(TABLES.MESSAGES, { messageId });
  }

  static async findByConversation(conversationId, limit = 20, lastKey = null) {
    const params = {
      TableName: TABLES.MESSAGES,
      KeyConditionExpression: 'conversationId = :cid',
      ExpressionAttributeValues: { ':cid': conversationId },
      ScanIndexForward: false, // Sort descending (newest first)
      Limit: limit,
      IndexName: 'conversationId-createdAt-index'
    };

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const result = await db.query(
      TABLES.MESSAGES,
      'conversationId = :cid',
      {},
      { ':cid': conversationId }
    );

    // DynamoDB doesn't support DESC in GSI the same way, so sort in code
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }

  static async countByConversationAndUser(conversationId, userId) {
    const messages = await db.query(
      TABLES.MESSAGES,
      'conversationId = :cid',
      {},
      { ':cid': conversationId }
    );

    return messages.filter(m =>
      m.sender !== userId &&
      !m.deletedFor.includes(userId) &&
      !m.readBy.some(r => r.user === userId)
    ).length;
  }

  static async save(message) {
    message.updatedAt = new Date().toISOString();
    return await db.put(TABLES.MESSAGES, message);
  }

  static async update(messageId, updates) {
    updates.updatedAt = new Date().toISOString();
    return await db.update(TABLES.MESSAGES, { messageId }, updates);
  }

  static async markAsRead(messageId, userId) {
    const message = await this.findById(messageId);
    if (!message) throw new Error('Message not found');

    const alreadyRead = message.readBy.some(r => r.user === userId);
    if (!alreadyRead) {
      message.readBy.push({
        user: userId,
        readAt: new Date().toISOString()
      });
      await this.save(message);
    }

    return message;
  }

  static async deleteMany(filter) {
    // Find messages matching filter and delete them
    let messages = [];

    if (filter.conversation) {
      messages = await db.query(
        TABLES.MESSAGES,
        'conversationId = :cid',
        {},
        { ':cid': filter.conversation }
      );
    } else {
      // Scan if no specific filter
      messages = await db.scan(TABLES.MESSAGES);
    }

    // Delete each message
    for (const msg of messages) {
      await db.delete(TABLES.MESSAGES, { messageId: msg.messageId });
    }

    return { deletedCount: messages.length };
  }

  static async updateMany(filter, updates) {
    // Find messages matching filter and update them
    let messages = [];

    if (filter.conversation) {
      messages = await db.query(
        TABLES.MESSAGES,
        'conversationId = :cid',
        {},
        { ':cid': filter.conversation }
      );
    }

    // Apply $addToSet or other operators
    for (const msg of messages) {
      if (updates.$addToSet && updates.$addToSet.deletedFor) {
        if (!msg.deletedFor) msg.deletedFor = [];
        if (!msg.deletedFor.includes(updates.$addToSet.deletedFor)) {
          msg.deletedFor.push(updates.$addToSet.deletedFor);
        }
      }
      await this.save(msg);
    }

    return { modifiedCount: messages.length };
  }

  static async countDocuments(filter) {
    let messages = [];

    if (filter.conversation) {
      messages = await db.query(
        TABLES.MESSAGES,
        'conversationId = :cid',
        {},
        { ':cid': filter.conversation }
      );
    } else {
      messages = await db.scan(TABLES.MESSAGES);
    }

    // Apply additional filters
    return messages.filter(m => {
      if (filter.sender && filter.sender.$ne && m.sender === filter.sender.$ne) return false;
      if (filter['readBy.user'] && filter['readBy.user'].$ne) {
        if (m.readBy.some(r => r.user === filter['readBy.user'].$ne)) return false;
      }
      if (filter.deletedFor && filter.deletedFor.$ne && m.deletedFor.includes(filter.deletedFor.$ne)) return false;
      return true;
    }).length;
  }

  static async populate(message, field) {
    // Simple population for sender
    if (field === 'sender' && message.sender) {
      const User = (await import('./User.js')).default;
      const sender = await User.findById(message.sender);
      return { ...message, sender };
    }
    return message;
  }
}

export default Message;
