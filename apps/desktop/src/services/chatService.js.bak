import api from './api';

export const chatAPI = {
  // Conversations
  getOrCreateConversation: (userId) =>
    api.post('/chat/conversation', { userId }),

  getConversations: () =>
    api.get('/chat/conversations'),

  getConversationDetails: (conversationId) =>
    api.get(`/chat/conversation/${conversationId}`),

  deleteConversation: (conversationId) =>
    api.delete(`/chat/conversation/${conversationId}`),

  // Messages
  getMessages: (conversationId, page = 1, limit = 20) =>
    api.get(`/chat/conversation/${conversationId}/messages`, {
      params: { page, limit }
    }),

  sendMessage: (conversationId, content, type = 'text') =>
    api.post(`/chat/conversation/${conversationId}/message`, {
      content,
      type
    }),

  markAsRead: (messageId) =>
    api.put(`/chat/message/${messageId}/read`),

  markConversationRead: (conversationId) =>
    api.put(`/chat/conversation/${conversationId}/read`),

  // Search (contacts only)
  searchUsers: (query) =>
    api.get('/chat/search/users', {
      params: { query }
    }),

  // Contacts
  getContacts: () =>
    api.get('/chat/contacts'),

  addContact: (email) =>
    api.post('/chat/contacts', { email }),

  removeContact: (contactId) =>
    api.delete(`/chat/contacts/${contactId}`),

  setContactNickname: (contactId, nickname) =>
    api.put(`/chat/contacts/${contactId}/nickname`, { nickname }),

  // File upload
  uploadMedia: (formData) =>
    api.post('/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // File download
  downloadFile: (messageId) =>
    api.get(`/chat/download/${messageId}`),

  // Online users
  getOnlineUsers: () =>
    api.get('/users/online')
};

export default chatAPI;
