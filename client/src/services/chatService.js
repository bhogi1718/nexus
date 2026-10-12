import api from './api';

// Path segments built from ids are encoded so an id can never alter the route.
const seg = (value) => encodeURIComponent(String(value));

export const chatAPI = {
  // Conversations
  getOrCreateConversation: (userId) => api.post('/chat/conversation', { userId }),
  getConversations: () => api.get('/chat/conversations'),
  getConversationDetails: (conversationId) => api.get(`/chat/conversation/${seg(conversationId)}`),
  deleteConversation: (conversationId) => api.delete(`/chat/conversation/${seg(conversationId)}`),

  // Messages — newest `limit` messages, or older ones before an ISO timestamp.
  getMessages: (conversationId, { limit = 50, before } = {}) =>
    api.get(`/chat/conversation/${seg(conversationId)}/messages`, { params: { limit, before } }),
  markAsRead: (messageId) => api.put(`/chat/message/${seg(messageId)}/read`),
  deleteMessage: (messageId) => api.delete(`/chat/message/${seg(messageId)}`),
  markConversationRead: (conversationId) => api.put(`/chat/conversation/${seg(conversationId)}/read`),

  // People
  searchUsers: (query) => api.get('/chat/search/users', { params: { query } }),
  getUserProfile: (userId) => api.get(`/chat/users/${seg(userId)}`),

  // Contacts
  getContacts: () => api.get('/chat/contacts'),
  addContact: (email) => api.post('/chat/contacts', { email }),
  removeContact: (contactId) => api.delete(`/chat/contacts/${seg(contactId)}`),
  setContactNickname: (contactId, nickname) =>
    api.put(`/chat/contacts/${seg(contactId)}/nickname`, { nickname }),

  // Files
  uploadMedia: (formData) =>
    api.post('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadFile: (messageId) =>
    api.get(`/chat/download/${seg(messageId)}`, { responseType: 'blob' }),
};

export default chatAPI;
