#!/usr/bin/env node

/**
 * Migration Script: MongoDB to DynamoDB
 *
 * Usage:
 *   node scripts/migrate-mongodb-to-dynamodb.js
 *
 * Prerequisites:
 *   - MongoDB connection string in MONGODB_URI env var
 *   - DynamoDB tables created
 *   - AWS credentials configured
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

dotenv.config({ path: './server/.env' });

// Initialize connections
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI not set in .env');
  process.exit(1);
}

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

// DynamoDB table names
const TABLES = {
  USERS: process.env.DYNAMODB_USERS_TABLE || 'nexus-users',
  MESSAGES: process.env.DYNAMODB_MESSAGES_TABLE || 'nexus-messages',
  CONVERSATIONS: process.env.DYNAMODB_CONVERSATIONS_TABLE || 'nexus-conversations',
  OTPS: process.env.DYNAMODB_OTPS_TABLE || 'nexus-otps'
};

// MongoDB Models (define schemas inline)
let MongoUser, MongoMessage, MongoConversation, MongoOTP;

async function initializeMongo() {
  console.log('📦 Connecting to MongoDB...');

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');

    // Define Mongoose schemas
    const userSchema = new mongoose.Schema({
      email: String,
      name: String,
      password: String,
      isEmailVerified: Boolean,
      avatar: String,
      status: String,
      publicKey: String,
      secretKey: String,
      contacts: [mongoose.Schema.Types.ObjectId],
      contactNicknames: mongoose.Schema.Types.Mixed,
      blockedUsers: [mongoose.Schema.Types.ObjectId],
      isOnline: Boolean,
      lastSeen: Date,
      accountLockoutUntil: Date,
      failedOtpAttempts: Number,
      createdAt: Date
    }, { timestamps: true });

    const conversationSchema = new mongoose.Schema({
      type: String,
      name: String,
      avatar: String,
      participants: [mongoose.Schema.Types.ObjectId],
      admin: mongoose.Schema.Types.ObjectId,
      lastMessage: mongoose.Schema.Types.ObjectId,
      lastMessageAt: Date,
      createdBy: mongoose.Schema.Types.ObjectId,
      deletedFor: [mongoose.Schema.Types.ObjectId],
      createdAt: Date,
      updatedAt: Date
    }, { timestamps: true });

    const messageSchema = new mongoose.Schema({
      conversation: mongoose.Schema.Types.ObjectId,
      sender: mongoose.Schema.Types.ObjectId,
      type: String,
      content: String,
      fileUrl: String,
      fileName: String,
      fileSize: Number,
      s3Key: String,
      readBy: [{
        user: mongoose.Schema.Types.ObjectId,
        readAt: Date
      }],
      deliveredTo: [mongoose.Schema.Types.ObjectId],
      deletedFor: [mongoose.Schema.Types.ObjectId],
      createdAt: Date,
      updatedAt: Date
    }, { timestamps: true });

    const otpSchema = new mongoose.Schema({
      email: String,
      otp: String,
      attempts: Number,
      maxAttempts: Number,
      expiresAt: Date,
      createdAt: Date
    }, { timestamps: true });

    // Register models
    MongoUser = mongoose.model('User', userSchema);
    MongoMessage = mongoose.model('Message', messageSchema);
    MongoConversation = mongoose.model('Conversation', conversationSchema);
    MongoOTP = mongoose.model('OTP', otpSchema);

    console.log('✅ Mongoose models registered');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function migrateUsers() {
  console.log('\n📥 Migrating Users...');

  try {
    const users = await MongoUser.find({});
    console.log(`  Found ${users.length} users to migrate`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      const dynamoUser = {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        password: user.password || null,
        isEmailVerified: user.isEmailVerified || false,
        avatar: user.avatar || null,
        status: user.status || "Hey there! I'm using Nexus",
        publicKey: user.publicKey || null,
        secretKey: user.secretKey || null,
        contacts: (user.contacts || []).map(c => c.toString()),
        contactNicknames: user.contactNicknames || {},
        blockedUsers: (user.blockedUsers || []).map(b => b.toString()),
        isOnline: user.isOnline || false,
        lastSeen: user.lastSeen?.toISOString() || new Date().toISOString(),
        accountLockoutUntil: user.accountLockoutUntil?.toISOString() || null,
        failedOtpAttempts: user.failedOtpAttempts || 0,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString()
      };

      await dynamoDocClient.send(new PutCommand({
        TableName: TABLES.USERS,
        Item: dynamoUser
      }));

      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Migrated ${i + 1}/${users.length} users`);
      }
    }

    console.log(`✅ Users migration complete (${users.length} total)`);
  } catch (error) {
    console.error('❌ Users migration failed:', error.message);
    throw error;
  }
}

async function migrateConversations() {
  console.log('\n📥 Migrating Conversations...');

  try {
    const conversations = await MongoConversation.find({});
    console.log(`  Found ${conversations.length} conversations to migrate`);

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];

      const dynamoConv = {
        conversationId: conv._id.toString(),
        type: conv.type || 'private',
        name: conv.name || null,
        avatar: conv.avatar || null,
        participants: (conv.participants || []).map(p => p.toString()),
        admin: conv.admin?.toString() || null,
        lastMessage: conv.lastMessage?.toString() || null,
        lastMessageAt: conv.lastMessageAt?.toISOString() || new Date().toISOString(),
        createdBy: conv.createdBy?.toString() || null,
        deletedFor: (conv.deletedFor || []).map(d => d.toString()),
        createdAt: conv.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: conv.updatedAt?.toISOString() || new Date().toISOString()
      };

      await dynamoDocClient.send(new PutCommand({
        TableName: TABLES.CONVERSATIONS,
        Item: dynamoConv
      }));

      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Migrated ${i + 1}/${conversations.length} conversations`);
      }
    }

    console.log(`✅ Conversations migration complete (${conversations.length} total)`);
  } catch (error) {
    console.error('❌ Conversations migration failed:', error.message);
    throw error;
  }
}

async function migrateMessages() {
  console.log('\n📥 Migrating Messages...');

  try {
    const messages = await MongoMessage.find({});
    console.log(`  Found ${messages.length} messages to migrate`);

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      const dynamoMsg = {
        messageId: msg._id.toString(),
        conversationId: msg.conversation.toString(),
        sender: msg.sender.toString(),
        type: msg.type || 'text',
        content: msg.content || null,
        fileUrl: msg.fileUrl || null,
        fileName: msg.fileName || null,
        fileSize: msg.fileSize || null,
        s3Key: msg.s3Key || null,
        readBy: (msg.readBy || []).map(r => ({
          user: r.user.toString(),
          readAt: r.readAt?.toISOString() || new Date().toISOString()
        })),
        deliveredTo: (msg.deliveredTo || []).map(d => d.toString()),
        deletedFor: (msg.deletedFor || []).map(d => d.toString()),
        createdAt: msg.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: msg.updatedAt?.toISOString() || new Date().toISOString()
      };

      await dynamoDocClient.send(new PutCommand({
        TableName: TABLES.MESSAGES,
        Item: dynamoMsg
      }));

      if ((i + 1) % 100 === 0) {
        console.log(`  ✓ Migrated ${i + 1}/${messages.length} messages`);
      }
    }

    console.log(`✅ Messages migration complete (${messages.length} total)`);
  } catch (error) {
    console.error('❌ Messages migration failed:', error.message);
    throw error;
  }
}

async function migrateOTPs() {
  console.log('\n📥 Migrating OTPs...');

  try {
    const otps = await MongoOTP.find({});
    console.log(`  Found ${otps.length} OTPs to migrate`);

    for (let i = 0; i < otps.length; i++) {
      const otp = otps[i];

      // Only migrate non-expired OTPs
      if (otp.expiresAt < new Date()) {
        console.log(`  ⊘ Skipping expired OTP for ${otp.email}`);
        continue;
      }

      const dynamoOTP = {
        otpId: otp._id.toString(),
        email: otp.email,
        otp: otp.otp,
        attempts: otp.attempts || 0,
        maxAttempts: otp.maxAttempts || 5,
        expiresAt: otp.expiresAt.toISOString(),
        createdAt: otp.createdAt?.toISOString() || new Date().toISOString()
      };

      await dynamoDocClient.send(new PutCommand({
        TableName: TABLES.OTPS,
        Item: dynamoOTP
      }));

      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Migrated ${i + 1}/${otps.length} OTPs`);
      }
    }

    console.log(`✅ OTPs migration complete (${otps.length} total)`);
  } catch (error) {
    console.error('❌ OTPs migration failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting MongoDB → DynamoDB Migration\n');
  console.log('Configuration:');
  console.log(`  Users table: ${TABLES.USERS}`);
  console.log(`  Messages table: ${TABLES.MESSAGES}`);
  console.log(`  Conversations table: ${TABLES.CONVERSATIONS}`);
  console.log(`  OTPs table: ${TABLES.OTPS}`);

  try {
    await initializeMongo();

    await migrateUsers();
    await migrateConversations();
    await migrateMessages();
    await migrateOTPs();

    console.log('\n✅ Migration Complete!');
    console.log('\n⚠️  Next steps:');
    console.log('  1. Verify data in DynamoDB tables');
    console.log('  2. Update your application to use DynamoDB models');
    console.log('  3. Test thoroughly before deleting MongoDB data');
    console.log('  4. Keep MongoDB backup for rollback if needed');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
