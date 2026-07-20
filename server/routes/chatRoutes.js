import express from 'express';
import csrf from 'csurf';
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
const csrfProtection = csrf({ cookie: false });

// All routes require authentication
router.use(verifyToken);

// Conversation routes
router.post('/conversation', csrfProtection, getOrCreateConversation);
router.get('/conversations', getConversations);
router.get('/conversation/:conversationId', getConversationDetails);
router.delete('/conversation/:conversationId', csrfProtection, deleteConversation);

// Message routes
router.get('/conversation/:conversationId/messages', getMessages);
router.post('/conversation/:conversationId/message', csrfProtection, sendMessage);
router.put('/message/:messageId/read', csrfProtection, markAsRead);
router.put('/conversation/:conversationId/read', csrfProtection, markConversationRead);

// Search (contacts only)
router.get('/search/users', searchUsers);

// Contacts
router.get('/contacts', getContacts);
router.post('/contacts', csrfProtection, addContact);
router.delete('/contacts/:contactId', csrfProtection, removeContact);
router.put('/contacts/:contactId/nickname', csrfProtection, setContactNickname);

// Media upload and download
router.post('/upload', csrfProtection, upload.single('file'), uploadMedia);
router.get('/download/:messageId', downloadFile);

export default router;
