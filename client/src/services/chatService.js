import api from './api';

export const chatAPI = {
  // Conversations
  getOrCreateConversation: (userId) =>
    api.post('/chat/conversation', { userId }),

  getConversations: () =>
    api.get('/chat/conversations'),

  getConversationDetails: (conversationId) =>
    api.get(`/chat/conversation/${conversationId}`),

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

  // Search
  searchUsers: (query) =>
    api.get('/chat/search/users', {
      params: { query }
    })
};

export default chatAPI;
