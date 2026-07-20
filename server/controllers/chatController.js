import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { uploadToS3, downloadFromS3, deleteFromS3, getS3Client, getBucketName } from '../services/s3Storage.js';
import { getIO } from '../services/socketRegistry.js';
import { sanitizeMessage } from '../services/sanitizationService.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';

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

    let conversation = await Conversation.findOne({
      type: 'private',
      participants: { $all: [currentUserId, userId] }
    }).populate('participants', '-password -__v').populate('lastMessage');

    if (!conversation) {
      // New conversations can only be started with someone in your contacts
      const me = await User.findById(currentUserId);
      const isContact = (me.contacts || []).some(c => String(c) === String(userId));
      if (!isContact) {
        return res.status(403).json({ message: 'Add this user to your contacts first' });
      }

      conversation = new Conversation({
        type: 'private',
        participants: [currentUserId, userId],
        createdBy: currentUserId
      });
      await conversation.save();
      // Refetch with populated data
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', '-password -__v')
        .populate('lastMessage');
    } else if (conversation.deletedFor && conversation.deletedFor.includes(currentUserId)) {
      // If conversation was deleted by current user, restore it
      conversation.deletedFor = conversation.deletedFor.filter(id => String(id) !== String(currentUserId));
      await conversation.save();
      // Refetch with populated data
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', '-password -__v')
        .populate('lastMessage');
    }

    res.status(200).json({ conversation });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all conversations for current user
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
      deletedFor: { $ne: req.userId }
    })
      .populate('participants', '-password -__v')
      .populate('lastMessage')
      .populate('createdBy', '-password')
      .sort({ lastMessageAt: -1 });

    // Attach unread message count per conversation (messages from others
    // that this user hasn't read and hasn't deleted)
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: req.userId },
          'readBy.user': { $ne: req.userId },
          deletedFor: { $ne: req.userId }
        });
        return { ...conv.toObject(), unreadCount };
      })
    );

    res.status(200).json({ conversations: conversationsWithUnread });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all messages in a conversation as read for the current user
export const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => String(p) === String(req.userId))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.userId },
        'readBy.user': { $ne: req.userId }
      },
      { $push: { readBy: { user: req.userId, readAt: new Date() } } }
    );

    // Tell the other participants their messages were read (blue ticks).
    // Emit to both the personal rooms AND the conversation room so the
    // sender gets it regardless of which room their socket is in.
    const io = getIO();
    if (io) {
      const payload = { conversationId, readerId: req.userId };
      io.to(`conversation:${conversationId}`).emit('messages:read', payload);
      conversation.participants.forEach(p => {
        if (String(p) !== String(req.userId)) {
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

    console.log('🔍 getMessages called:', { conversationId, userId: req.userId, page, limit });

    // Validate conversation ID format
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      console.log('❌ Invalid conversation ID format:', conversationId);
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    // Validate and constrain pagination
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(Math.max(1, parseInt(limit) || 20), 100);

    console.log('🔎 Finding conversation in DB:', conversationId);
    const conversation = await Conversation.findById(conversationId);
    console.log('📊 Conversation found:', !!conversation, conversation?._id);

    if (!conversation) {
      console.log('❌ Conversation not found for ID:', conversationId);
      // Debug: check all conversations for this user
      const userConversations = await Conversation.find({ participants: req.userId });
      console.log('👥 Conversations for user:', userConversations.map(c => c._id.toString()));
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if conversation is deleted for current user
    if (conversation.deletedFor && conversation.deletedFor.some(id => String(id) === String(req.userId))) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants || !conversation.participants.some(p => p && String(p) === String(req.userId))) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const skip = (page - 1) * limit;

    // Exclude messages this user has deleted
    const messageFilter = { conversation: conversationId, deletedFor: { $ne: req.userId } };

    const messages = await Message.find(messageFilter)
      .populate('sender', '-password')
      .populate('readBy.user', '-password')
      .populate('deliveredTo', '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalMessages = await Message.countDocuments(messageFilter);

    res.status(200).json({
      messages: messages.reverse(),
      totalMessages,
      page: parseInt(page),
      pages: Math.ceil(totalMessages / limit)
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send a message
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

    const message = new Message({
      conversation: conversationId,
      sender: req.userId,
      type,
      content: sanitizedContent,
      deliveredTo: conversation.participants.filter(id => id.toString() !== req.userId.toString())
    });

    await message.save();
    await message.populate('sender', '-password');

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(201).json({ message });
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

    const alreadyRead = message.readBy.some(r => r.user.toString() === req.userId.toString());
    if (!alreadyRead) {
      message.readBy.push({ user: req.userId });
      await message.save();
    }

    await message.populate('sender', '-password');
    await message.populate('readBy.user', '-password');

    res.status(200).json({ message });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search users — restricted to the requester's own contacts, so profiles
// of strangers are never exposed
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2 || query.length > 100) {
      return res.status(400).json({ message: 'Search query must be between 2 and 100 characters' });
    }

    // Sanitize regex special characters to prevent regex injection and ReDoS
    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const me = await User.findById(req.userId);

    const users = await User.find({
      _id: { $in: me.contacts || [] },
      $or: [
        { name: { $regex: sanitizedQuery, $options: 'i' } },
        { email: { $regex: sanitizedQuery, $options: 'i' } }
      ]
    }).select('-password').limit(10);

    res.status(200).json({ users });
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

    const contactUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!contactUser) {
      return res.status(404).json({ message: 'No user found with that email' });
    }

    if (String(contactUser._id) === String(req.userId)) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    const me = await User.findById(req.userId);
    if ((me.contacts || []).some(c => String(c) === String(contactUser._id))) {
      return res.status(400).json({ message: 'Already in your contacts' });
    }

    me.contacts.push(contactUser._id);
    await me.save();

    res.status(200).json({
      message: 'Contact added',
      contact: {
        _id: contactUser._id,
        name: contactUser.name,
        email: contactUser.email,
        avatar: contactUser.avatar,
        status: contactUser.status,
        isOnline: contactUser.isOnline
      }
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// List the requester's contacts (with any personal nicknames)
export const getContacts = async (req, res) => {
  try {
    const me = await User.findById(req.userId)
      .populate('contacts', 'name email avatar status isOnline');

    const contacts = (me.contacts || []).map(c => ({
      _id: c._id,
      name: c.name,
      email: c.email,
      avatar: c.avatar,
      status: c.status,
      isOnline: c.isOnline,
      nickname: me.contactNicknames?.get(String(c._id)) || null
    }));

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

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({ message: 'Invalid contact ID' });
    }

    const me = await User.findById(req.userId);
    if (!(me.contacts || []).some(c => String(c) === String(contactId))) {
      return res.status(400).json({ message: 'Not in your contacts' });
    }

    const trimmed = (nickname || '').trim();
    if (trimmed.length > 50) {
      return res.status(400).json({ message: 'Nickname too long (max 50 characters)' });
    }

    if (trimmed) {
      me.contactNicknames.set(String(contactId), trimmed);
    } else {
      me.contactNicknames.delete(String(contactId));
    }
    await me.save();

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
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({ message: 'Invalid contact ID' });
    }
    await User.findByIdAndUpdate(req.userId, { $pull: { contacts: contactId } });
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

    // Validate conversation ID format
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', '-password -__v')
      .populate('lastMessage')
      .populate('createdBy', '-password');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants || !conversation.participants.some(p => p && String(p._id) === String(req.userId))) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    res.status(200).json({ conversation });
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

    // Validate conversation ID format
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    // Verify user is a participant in the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants || !conversation.participants.some(p => p && String(p) === String(req.userId))) {
      return res.status(403).json({ message: 'Not authorized to upload to this conversation' });
    }

    console.log('Uploading file:', req.file.originalname, 'Size:', req.file.size, 'MIME:', req.file.mimetype);

    // Upload to S3 using file buffer with actual MIME type
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

// Download file with proper headers
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

    // Validate message ID format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    // Fetch the message to get file details
    const message = await Message.findById(messageId);
    if (!message || !message.fileUrl) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Verify user has access to this conversation
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants || !conversation.participants.some(p => p && p.toString() === req.userId.toString())) {
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

      // Verify buffer checksum (first and last 10 bytes for debugging)
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

    // Validate conversation ID format
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    // Find conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Verify user is a participant
    if (!conversation.participants || !conversation.participants.some(p => p && String(p) === String(req.userId))) {
      return res.status(403).json({ message: 'Not authorized to delete this conversation' });
    }

    // Mark conversation as deleted for this user only
    if (!conversation.deletedFor) {
      conversation.deletedFor = [];
    }

    // Check if already deleted for this user
    const alreadyDeleted = conversation.deletedFor.some(id => String(id) === String(req.userId));
    if (!alreadyDeleted) {
      conversation.deletedFor.push(req.userId);
      await conversation.save();
    }

    // Also delete all messages from this user's view, so they don't
    // reappear if the conversation is recreated later
    await Message.updateMany(
      { conversation: conversationId },
      { $addToSet: { deletedFor: req.userId } }
    );

    // If every participant has deleted the conversation, remove it entirely
    const allDeleted = conversation.participants.every(p =>
      conversation.deletedFor.some(id => String(id) === String(p))
    );

    if (allDeleted) {
      // Clean up S3 files from media messages (best-effort)
      const mediaMessages = await Message.find(
        { conversation: conversationId, s3Key: { $ne: null } },
        's3Key'
      );
      for (const msg of mediaMessages) {
        try {
          await deleteFromS3(msg.s3Key);
        } catch (s3Err) {
          console.error('Failed to delete S3 file:', msg.s3Key, s3Err.message);
        }
      }

      await Message.deleteMany({ conversation: conversationId });
      await Conversation.findByIdAndDelete(conversationId);
    }

    res.status(200).json({ message: 'Conversation deleted for you' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
