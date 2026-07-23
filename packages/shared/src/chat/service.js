/**
 * Chat Service
 *
 * High-level chat operations wrapper
 * Uses API client to communicate with backend
 *
 * @param {Object} config - Configuration
 * @param {Object} config.apiClient - Configured axios instance
 * @returns {Object} Chat service methods
 */
export const createChatService = (config) => {
  const { apiClient } = config;

  if (!apiClient) {
    throw new Error('apiClient is required');
  }

  return {
    // ===== Conversations =====

    async getOrCreateConversation(userId) {
      const response = await apiClient.post('/chat/conversation', { userId });
      return response.data.conversation;
    },

    async getConversations() {
      const response = await apiClient.get('/chat/conversations');
      return response.data.conversations || [];
    },

    async getConversationDetails(conversationId) {
      const response = await apiClient.get(`/chat/conversation/${conversationId}`);
      return response.data.conversation;
    },

    async deleteConversation(conversationId) {
      await apiClient.delete(`/chat/conversation/${conversationId}`);
    },

    // ===== Messages =====

    async getMessages(conversationId, page = 1, limit = 20) {
      const response = await apiClient.get(`/chat/conversation/${conversationId}/messages`, {
        params: { page, limit }
      });
      return response.data.messages || [];
    },

    async sendMessage(conversationId, content, type = 'text') {
      const response = await apiClient.post(`/chat/conversation/${conversationId}/message`, {
        content,
        type
      });
      return response.data.message;
    },

    async markAsRead(messageId) {
      await apiClient.put(`/chat/message/${messageId}/read`);
    },

    async markConversationRead(conversationId) {
      await apiClient.put(`/chat/conversation/${conversationId}/read`);
    },

    async deleteMessage(messageId) {
      await apiClient.delete(`/chat/message/${messageId}`);
    },

    // ===== Search =====

    async searchUsers(query) {
      const response = await apiClient.get('/chat/search/users', {
        params: { query }
      });
      return response.data.users || [];
    },

    // ===== Contacts =====

    async getContacts() {
      const response = await apiClient.get('/chat/contacts');
      return response.data.contacts || [];
    },

    async addContact(email) {
      const response = await apiClient.post('/chat/contacts', { email });
      return response.data.contact;
    },

    async removeContact(contactId) {
      await apiClient.delete(`/chat/contacts/${contactId}`);
    },

    async setContactNickname(contactId, nickname) {
      const response = await apiClient.put(`/chat/contacts/${contactId}/nickname`, { nickname });
      return response.data.nickname;
    },

    // ===== Media/Files =====

    async uploadMedia(formData) {
      const response = await apiClient.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return {
        url: response.data.url,
        fileName: response.data.fileName,
        fileSize: response.data.fileSize,
        type: response.data.type,
        s3Key: response.data.s3Key
      };
    },

    async downloadFile(messageId) {
      const response = await apiClient.get(`/chat/download/${messageId}`);
      return response.data;
    },

    // ===== Online Status =====

    async getOnlineUsers() {
      const response = await apiClient.get('/users/online');
      return response.data.onlineUsers || [];
    }
  };
};

export default createChatService;
