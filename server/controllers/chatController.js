import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { uploadToS3, downloadFromS3, deleteFromS3, getS3Client, getBucketName } from '../services/s3Storage.js';
import { getIO } from '../services/socketRegistry.js';
import { sanitizeMessage } from '../services/sanitizationService.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';

// Format user for frontend (map userId to _id)
const formatUser = (user) => user ? {
  _id: user.userId,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  status: user.status,
  isOnline: user.isOnline,
  publicKey: user.publicKey
} : null;

// Format message for frontend (map messageId to _id, conversationId to conversation)
const formatMessage = (message) => message ? {
  _id: message.messageId,
  conversation: message.conversationId,
  sender: message.sender,
  type: message.type,
  content: message.content,
  fileUrl: message.fileUrl,
  fileName: message.fileName,
  fileSize: message.fileSize,
  s3Key: message.s3Key,
  readBy: message.readBy,
  deliveredTo: message.deliveredTo,
  deletedFor: message.deletedFor,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt
} : null;

// Format conversation for frontend (map conversationId to _id)
const formatConversation = (conversation) => conversation ? {
  _id: conversation.conversationId,
  type: conversation.type,
  name: conversation.name,
  avatar: conversation.avatar,
  participants: conversation.participants,
  admin: conversation.admin,
  lastMessage: conversation.lastMessage,
  lastMessageAt: conversation.lastMessageAt,
  createdBy: conversation.createdBy,
  createdAt: conversation.createdAt,
  deletedFor: conversation.deletedFor
} : null;

// Create or get private conversation
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.userId;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (currentUserId === userId) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    // Verify target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find existing private conversation
    let conversation = await Conversation.findOne({
      type: 'private',
      participants: { $all: [currentUserId, userId] }
    });

    if (!conversation) {
      // New conversations can only be started with someone in your contacts
      const me = await User.findById(currentUserId);
      const isContact = (me.contacts || []).includes(userId);
      if (!isContact) {
        return res.status(403).json({ message: 'Add this user to your contacts first' });
      }

      conversation = await Conversation.create({
        type: 'private',
        participants: [currentUserId, userId],
        createdBy: currentUserId
      });
    } else if (conversation.deletedFor && conversation.deletedFor.includes(currentUserId)) {
      // If conversation was deleted by current user, restore it
      await Conversation.update(conversation.conversationId, {
        deletedFor: conversation.deletedFor.filter(id => id !== currentUserId)
      });
      conversation = await Conversation.findById(conversation.conversationId);
    }

    // Populate participants with user details
    const participants = await Promise.all(
      conversation.participants.map(async (pId) => {
        const user = await User.findById(pId);
        return formatUser(user);
      })
    );

    // Populate lastMessage
    let lastMessage = null;
    if (conversation.lastMessage) {
      const msg = await Message.findById(conversation.lastMessage);
      if (msg) {
        // Populate sender in message
        const sender = await User.findById(msg.sender);
        lastMessage = formatMessage({ ...msg, sender: formatUser(sender) });
      }
    }

    res.status(200).json({
      conversation: formatConversation({
        ...conversation,
        participants,
        lastMessage
      })
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all conversations for current user
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId
    });

    // Filter out deleted conversations and sort
    const filtered = conversations
      .filter(c => !c.deletedFor || !c.deletedFor.includes(req.userId))
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    // Add unread counts and populate data
    const result = await Promise.all(
      filtered.map(async (conv) => {
        const messages = await Message.findByConversation(conv.conversationId);
        const unreadCount = messages.filter(m =>
          m.sender !== req.userId &&
          !m.deletedFor.includes(req.userId) &&
          !m.readBy.some(r => r.user === req.userId)
        ).length;

        // Populate participants
        const participants = await Promise.all(
          conv.participants.map(async (pId) => {
            const user = await User.findById(pId);
            return formatUser(user);
          })
        );

        // Populate lastMessage
        let lastMessage = null;
        if (conv.lastMessage) {
          const msg = await Message.findById(conv.lastMessage);
          if (msg) {
            const sender = await User.findById(msg.sender);
            lastMessage = formatMessage({ ...msg, sender: formatUser(sender) });
          }
        }

        return {
          ...formatConversation(conv),
          participants,
          lastMessage,
          unreadCount
        };
      })
    );

    res.status(200).json({ conversations: result });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all messages in a conversation as read for the current user
export const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get all messages and mark unread ones as read
    const messages = await Message.findByConversation(conversationId);
    for (const message of messages) {
      if (message.sender !== req.userId && !message.readBy.some(r => r.user === req.userId)) {
        await Message.update(message.messageId, {
          readBy: [...message.readBy, { user: req.userId, readAt: new Date().toISOString() }]
        });
      }
    }

    // Tell the other participants their messages were read
    const io = getIO();
    if (io) {
      const payload = { conversationId, readerId: req.userId };
      io.to(`conversation:${conversationId}`).emit('messages:read', payload);
      conversation.participants.forEach(p => {
        if (p !== req.userId) {
          io.to(`user:${p}`).emit('messages:read', payload);
        }
      });
    }

    res.status(200).json({ message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Mark conversation read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    let { page = 1, limit = 20 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if conversation is deleted for current user
    if (conversation.deletedFor && conversation.deletedFor.includes(req.userId)) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants || !conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    // Validate and constrain pagination
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(Math.max(1, parseInt(limit) || 20), 100);

    const allMessages = await Message.findByConversation(conversationId);

    // Filter out deleted messages and apply pagination
    const filtered = allMessages
      .filter(m => !m.deletedFor || !m.deletedFor.includes(req.userId))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Ascending for display

    const start = (page - 1) * limit;
    const pageMessages = filtered.slice(start, start + limit);

    // Populate senders
    const messages = await Promise.all(
      pageMessages.map(async (msg) => {
        const sender = await User.findById(msg.sender);
        return formatMessage({ ...msg, sender: formatUser(sender) });
      })
    );

    res.status(200).json({
      messages,
      totalMessages: filtered.length,
      page: parseInt(page),
      pages: Math.ceil(filtered.length / limit)
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send a message (REST endpoint - mainly for non-socket clients)
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type = 'text' } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to send message' });
    }

    const sanitizedContent = sanitizeMessage(content);

    // Get who's online
    const onlineUsers = new Set(); // In production, check real online status
    const deliveredTo = conversation.participants.filter(id => id !== req.userId && onlineUsers.has(id));

    const message = await Message.create({
      conversationId,
      sender: req.userId,
      type,
      content: sanitizedContent,
      deliveredTo
    });

    const sender = await User.findById(req.userId);
    const formattedMsg = formatMessage({ ...message, sender: formatUser(sender) });

    // Update conversation's last message
    await Conversation.update(conversationId, {
      lastMessage: message.messageId,
      lastMessageAt: new Date().toISOString()
    });

    res.status(201).json({ message: formattedMsg });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark message as read
export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const alreadyRead = message.readBy.some(r => r.user === req.userId);
    if (!alreadyRead) {
      await Message.update(messageId, {
        readBy: [...message.readBy, { user: req.userId, readAt: new Date().toISOString() }]
      });
    }

    const updatedMessage = await Message.findById(messageId);
    const sender = await User.findById(updatedMessage.sender);
    res.status(200).json({ message: formatMessage({ ...updatedMessage, sender: formatUser(sender) }) });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search users — restricted to the requester's own contacts
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2 || query.length > 100) {
      return res.status(400).json({ message: 'Search query must be between 2 and 100 characters' });
    }

    const queryLower = query.toLowerCase();
    const me = await User.findById(req.userId);
    const contactIds = me.contacts || [];

    // Get contact details and filter by query
    const contactUsers = await Promise.all(
      contactIds.map(async (contactId) => {
        const contact = await User.findById(contactId);
        return contact;
      })
    );

    const filtered = contactUsers
      .filter(Boolean)
      .filter(u =>
        (u.name && u.name.toLowerCase().includes(queryLower)) ||
        (u.email && u.email.toLowerCase().includes(queryLower))
      )
      .slice(0, 10)
      .map(u => formatUser(u));

    res.status(200).json({ users: filtered });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a contact by exact email address
export const addContact = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
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

    await User.update(req.userId, {
      contacts: [...(me.contacts || []), contactUser.userId]
    });

    res.status(200).json({
      message: 'Contact added',
      contact: formatUser(contactUser)
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// List the requester's contacts (with any personal nicknames)
export const getContacts = async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    if (!me) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get contact details from DynamoDB
    const contactIds = me.contacts || [];
    const contactUsers = await Promise.all(
      contactIds.map(async (contactId) => {
        try {
          const contact = await User.findById(contactId);
          if (!contact) return null;

          return {
            ...formatUser(contact),
            nickname: (me.contactNicknames && me.contactNicknames[contact.userId]) || null
          };
        } catch (err) {
          console.error(`Error fetching contact ${contactId}:`, err);
          return null;
        }
      })
    );

    const contacts = contactUsers.filter(Boolean);
    res.status(200).json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Set (or clear with empty value) a personal nickname for a contact
export const setContactNickname = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { nickname } = req.body;

    const me = await User.findById(req.userId);
    if (!(me.contacts || []).includes(contactId)) {
      return res.status(400).json({ message: 'Not in your contacts' });
    }

    const trimmed = (nickname || '').trim();
    if (trimmed.length > 50) {
      return res.status(400).json({ message: 'Nickname too long (max 50 characters)' });
    }

    const updated = { ...me.contactNicknames || {} };
    if (trimmed) {
      updated[contactId] = trimmed;
    } else {
      delete updated[contactId];
    }

    await User.update(req.userId, { contactNicknames: updated });

    res.status(200).json({ message: 'Nickname updated', nickname: trimmed || null });
  } catch (error) {
    console.error('Set nickname error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove a contact
export const removeContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const me = await User.findById(req.userId);
    if (!(me.contacts || []).includes(contactId)) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    await User.update(req.userId, {
      contacts: (me.contacts || []).filter(id => id !== contactId)
    });

    res.status(200).json({ message: 'Contact removed' });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get conversation details
export const getConversationDetails = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants || !conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    // Populate participants
    const participants = await Promise.all(
      conversation.participants.map(async (pId) => {
        const user = await User.findById(pId);
        return formatUser(user);
      })
    );

    // Populate lastMessage
    let lastMessage = null;
    if (conversation.lastMessage) {
      const msg = await Message.findById(conversation.lastMessage);
      if (msg) {
        const sender = await User.findById(msg.sender);
        lastMessage = formatMessage({ ...msg, sender: formatUser(sender) });
      }
    }

    const createdByUser = conversation.createdBy ? await User.findById(conversation.createdBy) : null;

    res.status(200).json({
      conversation: formatConversation({
        ...conversation,
        participants,
        lastMessage,
        createdBy: formatUser(createdByUser)
      })
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload media file
export const uploadMedia = async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }

    // Verify user is a participant in the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants || !conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to upload to this conversation' });
    }

    console.log('Uploading file:', req.file.originalname, 'Size:', req.file.size, 'MIME:', req.file.mimetype);

    // Upload to S3
    const uploadResult = await uploadToS3(req.file.buffer, req.file.originalname, conversationId, req.file.mimetype);

    console.log('Upload successful:', uploadResult.url);

    res.status(200).json({
      url: uploadResult.url,
      fileName: req.file.originalname,
      fileSize: uploadResult.size,
      s3Key: uploadResult.key
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

// Helper function to get MIME type based on file extension
const getMimeType = (fileName) => {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

export const downloadFile = async (req, res) => {
  try {
    const { messageId } = req.params;

    console.log('📥 Download request for message:', messageId);

    // Fetch the message to get file details
    const message = await Message.findById(messageId);
    if (!message || !message.fileUrl) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Verify user has access to this conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants || !conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to download this file' });
    }

    console.log('✓ Authorization passed, downloading from S3');

    // Get proper MIME type
    const mimeType = getMimeType(message.fileName);

    try {
      if (!message.s3Key) {
        return res.status(400).json({ message: 'File not available in S3' });
      }

      console.log('📥 Streaming file from S3:', message.s3Key);

      // Set headers BEFORE starting stream
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(message.fileName)}"`);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Create S3 GetObject command
      const command = new GetObjectCommand({
        Bucket: getBucketName(),
        Key: message.s3Key
      });

      // Get S3 client and send command to get stream
      const s3Client = getS3Client();
      const s3Response = await s3Client.send(command);

      const expectedSize = s3Response.ContentLength;
      console.log(`📥 S3 response received | Expected size: ${expectedSize} bytes | MIME: ${s3Response.ContentType}`);

      // Read stream into buffer with verification
      const chunks = [];
      for await (const chunk of s3Response.Body) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      const actualSize = buffer.length;

      console.log(`✓ Buffer created | Actual size: ${actualSize} bytes | Matches: ${actualSize === expectedSize ? 'YES' : 'NO'}`);

      // Verify buffer is not empty
      if (actualSize === 0) {
        return res.status(400).json({ message: 'File is empty' });
      }

      // Verify buffer checksum
      const firstBytes = buffer.slice(0, 10).toString('hex');
      const lastBytes = buffer.slice(-10).toString('hex');
      console.log(`📋 Buffer checksum | First 10 bytes: ${firstBytes} | Last 10 bytes: ${lastBytes}`);

      // Send with explicit binary encoding
      res.setHeader('Content-Length', actualSize);
      console.log(`📤 Sending ${actualSize} bytes to client with Content-Length header`);

      res.type(mimeType);
      res.send(buffer);

      console.log('✓ Buffer sent to client:', message.fileName);
    } catch (err) {
      console.error('❌ Failed to stream file:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to download file from storage' });
      }
    }
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Delete conversation (for current user only)
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Find conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Verify user is a participant
    if (!conversation.participants || !conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to delete this conversation' });
    }

    // Mark conversation as deleted for this user only
    const deletedFor = conversation.deletedFor || [];
    if (!deletedFor.includes(req.userId)) {
      deletedFor.push(req.userId);
      await Conversation.update(conversationId, { deletedFor });
    }

    // Also mark all messages as deleted for this user
    const messages = await Message.findByConversation(conversationId);
    for (const msg of messages) {
      const msgDeletedFor = msg.deletedFor || [];
      if (!msgDeletedFor.includes(req.userId)) {
        msgDeletedFor.push(req.userId);
        await Message.update(msg.messageId, { deletedFor: msgDeletedFor });
      }
    }

    // Check if every participant has deleted the conversation
    const updatedConv = await Conversation.findById(conversationId);
    const allDeleted = updatedConv.participants.every(p =>
      updatedConv.deletedFor && updatedConv.deletedFor.includes(p)
    );

    if (allDeleted) {
      // Clean up S3 files from media messages (best-effort)
      const mediaMessages = messages.filter(m => m.s3Key);
      for (const msg of mediaMessages) {
        try {
          await deleteFromS3(msg.s3Key);
        } catch (s3Err) {
          console.error('Failed to delete S3 file:', msg.s3Key, s3Err.message);
        }
      }

      // Delete all messages and conversation
      for (const msg of messages) {
        await Message.deleteMany({ messageId: msg.messageId });
      }
      await Conversation.findByIdAndDelete(conversationId);
    }

    res.status(200).json({ message: 'Conversation deleted for you' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
