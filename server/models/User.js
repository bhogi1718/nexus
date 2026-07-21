import { v4 as uuidv4 } from 'uuid';
import db, { TABLES } from '../services/dynamodb.js';

export class User {
  static async create(data) {
    const user = {
      userId: data.userId || uuidv4(),
      email: data.email,
      name: data.name,
      password: data.password || null,
      isEmailVerified: data.isEmailVerified || false,
      avatar: data.avatar || null,
      status: data.status || "Hey there! I'm using Nexus",
      publicKey: data.publicKey || null,
      secretKey: data.secretKey || null,
      contacts: data.contacts || [],
      contactNicknames: data.contactNicknames || {},
      blockedUsers: data.blockedUsers || [],
      isOnline: data.isOnline || false,
      lastSeen: new Date().toISOString(),
      accountLockoutUntil: null,
      failedOtpAttempts: 0,
      createdAt: new Date().toISOString()
    };

    return await db.put(TABLES.USERS, user);
  }

  static async findById(userId) {
    return await db.get(TABLES.USERS, { userId });
  }

  static async findByEmail(email) {
    const users = await db.query(
      TABLES.USERS,
      'email = :email',
      {},
      { ':email': email },
      'email-index' // GSI on email
    );
    return users[0] || null;
  }

  static async findByIdWithSecretKey(userId) {
    // In DynamoDB, all attributes are returned by default
    return await db.get(TABLES.USERS, { userId });
  }

  static async update(userId, updates) {
    return await db.update(TABLES.USERS, { userId }, updates);
  }

  static async findByIdAndUpdate(userId, updates) {
    return await this.update(userId, updates);
  }

  static async addContact(userId, contactId) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    if (!user.contacts.includes(contactId)) {
      user.contacts.push(contactId);
      await db.update(TABLES.USERS, { userId }, { contacts: user.contacts });
    }

    return user;
  }

  static async removeContact(userId, contactId) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    user.contacts = user.contacts.filter(id => id !== contactId);
    await db.update(TABLES.USERS, { userId }, { contacts: user.contacts });

    return user;
  }

  static async setContactNickname(userId, contactId, nickname) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    if (!user.contactNicknames) {
      user.contactNicknames = {};
    }

    if (nickname) {
      user.contactNicknames[contactId] = nickname;
    } else {
      delete user.contactNicknames[contactId];
    }

    await db.update(TABLES.USERS, { userId }, { contactNicknames: user.contactNicknames });

    return user;
  }
}

export default User;
