/**
 * Chat API Service
 *
 * High-level chat/messaging endpoints
 * Wraps the axios client with chat-specific methods
 *
 * @param {AxiosInstance} api - Configured axios client
 * @returns {Object} Chat API methods
 */
export const createChatApi = (api) => ({
  // ===== Conversations =====

  /**
   * Get or create a conversation with a user
   * @param {string} userId - User ID to start conversation with
   * @returns {Promise<Object>} { conversation }
   */
  getOrCreateConversation: (userId) =>
    api.post('/chat/conversation', { userId }),

  /**
   * Get all conversations for current user
   * @returns {Promise<Object>} { conversations }
   */
  getConversations: () =>
    api.get('/chat/conversations'),

  /**
   * Get conversation details
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} { conversation }
   */
  getConversationDetails: (conversationId) =>
    api.get(`/chat/conversation/${conversationId}`),

  /**
   * Delete a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<void>}
   */
  deleteConversation: (conversationId) =>
    api.delete(`/chat/conversation/${conversationId}`),

  // ===== Messages =====

  /**
   * Get messages from a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Messages per page (default: 20)
   * @returns {Promise<Object>} { messages }
   */
  getMessages: (conversationId, page = 1, limit = 20) =>
    api.get(`/chat/conversation/${conversationId}/messages`, {
      params: { page, limit }
    }),

  /**
   * Send a message via REST (for non-Socket.IO fallback)
   * @param {string} conversationId - Conversation ID
   * @param {string} content - Message content
   * @param {string} type - Message type (default: 'text')
   * @returns {Promise<Object>} { message }
   */
  sendMessage: (conversationId, content, type = 'text') =>
    api.post(`/chat/conversation/${conversationId}/message`, {
      content,
      type
    }),

  /**
   * Mark a message as read
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   */
  markAsRead: (messageId) =>
    api.put(`/chat/message/${messageId}/read`),

  /**
   * Mark entire conversation as read
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<void>}
   */
  markConversationRead: (conversationId) =>
    api.put(`/chat/conversation/${conversationId}/read`),

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   */
  deleteMessage: (messageId) =>
    api.delete(`/chat/message/${messageId}`),

  // ===== Search =====

  /**
   * Search for users
   * @param {string} query - Search query
   * @returns {Promise<Object>} { users }
   */
  searchUsers: (query) =>
    api.get('/chat/search/users', {
      params: { query }
    }),

  // ===== Contacts =====

  /**
   * Get all contacts for current user
   * @returns {Promise<Object>} { contacts }
   */
  getContacts: () =>
    api.get('/chat/contacts'),

  /**
   * Add a contact by email
   * @param {string} email - Contact email
   * @returns {Promise<Object>} { contact }
   */
  addContact: (email) =>
    api.post('/chat/contacts', { email }),

  /**
   * Remove a contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<void>}
   */
  removeContact: (contactId) =>
    api.delete(`/chat/contacts/${contactId}`),

  /**
   * Set or update contact nickname
   * @param {string} contactId - Contact ID
   * @param {string} nickname - New nickname
   * @returns {Promise<Object>} { nickname }
   */
  setContactNickname: (contactId, nickname) =>
    api.put(`/chat/contacts/${contactId}/nickname`, { nickname }),

  // ===== Media/Files =====

  /**
   * Upload media file
   * @param {FormData} formData - FormData with file
   * @returns {Promise<Object>} { url, fileName, fileSize, type, s3Key }
   */
  uploadMedia: (formData) =>
    api.post('/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  /**
   * Download file
   * @param {string} messageId - Message ID
   * @returns {Promise<Blob>} File blob
   */
  downloadFile: (messageId) =>
    api.get(`/chat/download/${messageId}`),

  // ===== Online Status =====

  /**
   * Get list of currently online users
   * @returns {Promise<Object>} { onlineUsers: string[] }
   */
  getOnlineUsers: () =>
    api.get('/users/online')
});

export default createChatApi;
