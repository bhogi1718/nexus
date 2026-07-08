import express from 'express';
import {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  markConversationRead,
  searchUsers,
  getConversationDetails,
  uploadMedia,
  downloadFile,
  deleteConversation,
  addContact,
  getContacts,
  removeContact,
  setContactNickname
} from '../controllers/chatController.js';
import { verifyToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Conversation routes
router.post('/conversation', getOrCreateConversation);
router.get('/conversations', getConversations);
router.get('/conversation/:conversationId', getConversationDetails);
router.delete('/conversation/:conversationId', deleteConversation);

// Message routes
router.get('/conversation/:conversationId/messages', getMessages);
router.post('/conversation/:conversationId/message', sendMessage);
router.put('/message/:messageId/read', markAsRead);
router.put('/conversation/:conversationId/read', markConversationRead);

// Search (contacts only)
router.get('/search/users', searchUsers);

// Contacts
router.get('/contacts', getContacts);
router.post('/contacts', addContact);
router.delete('/contacts/:contactId', removeContact);
router.put('/contacts/:contactId/nickname', setContactNickname);

// Media upload and download
router.post('/upload', upload.single('file'), uploadMedia);
router.get('/download/:messageId', downloadFile);

export default router;
