import express from 'express';
import {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  searchUsers,
  getConversationDetails
} from '../controllers/chatController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Conversation routes
router.post('/conversation', getOrCreateConversation);
router.get('/conversations', getConversations);
router.get('/conversation/:conversationId', getConversationDetails);

// Message routes
router.get('/conversation/:conversationId/messages', getMessages);
router.post('/conversation/:conversationId/message', sendMessage);
router.put('/message/:messageId/read', markAsRead);

// Search
router.get('/search/users', searchUsers);

export default router;
