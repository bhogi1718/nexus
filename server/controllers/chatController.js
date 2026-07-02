import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

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

    let conversation = await Conversation.findOne({
      type: 'private',
      participants: { $all: [currentUserId, userId] }
    }).populate('participants', '-password').populate('lastMessage');

    if (!conversation) {
      conversation = new Conversation({
        type: 'private',
        participants: [currentUserId, userId],
        createdBy: currentUserId
      });
      await conversation.save();
      // Refetch with populated data
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', '-password')
        .populate('lastMessage');
    }

    res.status(200).json({ conversation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all conversations for current user
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId
    })
      .populate('participants', '-password')
      .populate('lastMessage')
      .populate('createdBy', '-password')
      .sort({ lastMessageAt: -1 });

    res.status(200).json({ conversations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', '-password')
      .populate('readBy.user', '-password')
      .populate('deliveredTo', '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalMessages = await Message.countDocuments({ conversation: conversationId });

    res.status(200).json({
      messages: messages.reverse(),
      totalMessages,
      page: parseInt(page),
      pages: Math.ceil(totalMessages / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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

    const message = new Message({
      conversation: conversationId,
      sender: req.userId,
      type,
      content,
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
    res.status(500).json({ message: 'Server error', error: error.message });
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Search users
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.userId }
    }).select('-password').limit(10);

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get conversation details
export const getConversationDetails = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', '-password')
      .populate('lastMessage')
      .populate('createdBy', '-password');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => p._id.toString() === req.userId.toString())) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    res.status(200).json({ conversation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
