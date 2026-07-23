import { io } from 'socket.io-client';

/**
 * Socket.IO Wrapper
 *
 * Manages WebSocket connection to real-time server
 * Handles authentication, reconnection, room management, event listeners
 *
 * @param {Object} config - Configuration
 * @param {string} config.socketUrl - Socket.IO server URL
 * @param {Function} config.getToken - Function that returns auth token
 * @returns {Object} Socket.IO wrapper with all methods
 */
export const createSocketWrapper = (config) => {
  const { socketUrl, getToken } = config;

  if (!socketUrl) {
    throw new Error('socketUrl is required');
  }
  if (!getToken || typeof getToken !== 'function') {
    throw new Error('getToken function is required');
  }

  let socket = null;
  let currentConversationId = null;
  const listeners = new Map();

  return {
    /**
     * Initialize Socket.IO connection
     * Reuses existing socket if already created
     *
     * @returns {Socket} Socket.IO instance
     */
    initialize() {
      if (socket) {
        return socket;
      }

      socket = io(socketUrl, {
        auth: {
          token: getToken()
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      });

      // Handle connection
      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        // Rejoin conversation room after reconnect
        if (currentConversationId) {
          socket.emit('conversation:join', currentConversationId);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      return socket;
    },

    /**
     * Get current socket instance
     * @returns {Socket|null} Socket.IO instance or null
     */
    getInstance() {
      return socket;
    },

    /**
     * Disconnect socket and clear listeners
     */
    disconnect() {
      currentConversationId = null;
      if (socket) {
        socket.disconnect();
        socket = null;
        listeners.clear();
      }
    },

    // ===== Conversation Management =====

    /**
     * Join conversation room
     * @param {string} conversationId - Conversation ID
     */
    joinConversation(conversationId) {
      currentConversationId = conversationId;
      if (socket) {
        socket.emit('conversation:join', conversationId);
      }
    },

    /**
     * Leave conversation room
     * @param {string} conversationId - Conversation ID
     */
    leaveConversation(conversationId) {
      if (currentConversationId === conversationId) {
        currentConversationId = null;
      }
      if (socket) {
        socket.emit('conversation:leave', conversationId);
      }
    },

    // ===== Message Sending =====

    /**
     * Send message via Socket.IO
     * @param {string} conversationId - Conversation ID
     * @param {string} content - Message content
     * @param {Object} mediaData - Optional media data
     * @returns {Promise<Object>} Message send response
     */
    sendMessage(conversationId, content, mediaData = null) {
      return new Promise((resolve, reject) => {
        if (!socket) {
          reject(new Error('Socket not connected'));
          return;
        }

        const payload = { conversationId, content };
        if (mediaData) {
          payload.fileUrl = mediaData.fileUrl;
          payload.fileName = mediaData.fileName;
          payload.fileSize = mediaData.fileSize;
          payload.type = mediaData.type;
          payload.s3Key = mediaData.s3Key;
        }

        socket.emit('message:send', payload, (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to send message'));
          }
        });
      });
    },

    // ===== Typing Indicators =====

    /**
     * Emit typing start event
     * @param {string} conversationId - Conversation ID
     */
    startTyping(conversationId) {
      if (socket) {
        socket.emit('typing:start', conversationId);
      }
    },

    /**
     * Emit typing stop event
     * @param {string} conversationId - Conversation ID
     */
    stopTyping(conversationId) {
      if (socket) {
        socket.emit('typing:stop', conversationId);
      }
    },

    // ===== Read Receipts =====

    /**
     * Mark message as read
     * @param {string} messageId - Message ID
     */
    markMessageAsRead(messageId) {
      if (socket) {
        socket.emit('message:read', messageId);
      }
    },

    // ===== Event Listeners =====

    /**
     * Listen for incoming messages
     * @param {Function} callback - Callback function
     */
    onMessageReceive(callback) {
      if (socket) {
        if (!listeners.has('message:receive')) {
          listeners.set('message:receive', []);
        }
        listeners.get('message:receive').push(callback);
        socket.on('message:receive', callback);
      }
    },

    /**
     * Listen for conversation notifications (messages in background)
     * @param {Function} callback - Callback function
     */
    onConversationNotify(callback) {
      if (socket) {
        if (!listeners.has('conversation:notify')) {
          listeners.set('conversation:notify', []);
        }
        listeners.get('conversation:notify').push(callback);
        socket.on('conversation:notify', callback);
      }
    },

    /**
     * Listen for messages read receipts
     * @param {Function} callback - Callback function
     */
    onMessagesRead(callback) {
      if (socket) {
        if (!listeners.has('messages:read')) {
          listeners.set('messages:read', []);
        }
        listeners.get('messages:read').push(callback);
        socket.on('messages:read', callback);
      }
    },

    /**
     * Listen for typing start events
     * @param {Function} callback - Callback function
     */
    onTypingStart(callback) {
      if (socket) {
        if (!listeners.has('typing:start')) {
          listeners.set('typing:start', []);
        }
        listeners.get('typing:start').push(callback);
        socket.on('typing:start', callback);
      }
    },

    /**
     * Listen for typing stop events
     * @param {Function} callback - Callback function
     */
    onTypingStop(callback) {
      if (socket) {
        if (!listeners.has('typing:stop')) {
          listeners.set('typing:stop', []);
        }
        listeners.get('typing:stop').push(callback);
        socket.on('typing:stop', callback);
      }
    },

    /**
     * Listen for user online events
     * @param {Function} callback - Callback function
     */
    onUserOnline(callback) {
      if (socket) {
        if (!listeners.has('user:online')) {
          listeners.set('user:online', []);
        }
        listeners.get('user:online').push(callback);
        socket.on('user:online', callback);
      }
    },

    /**
     * Listen for user offline events
     * @param {Function} callback - Callback function
     */
    onUserOffline(callback) {
      if (socket) {
        if (!listeners.has('user:offline')) {
          listeners.set('user:offline', []);
        }
        listeners.get('user:offline').push(callback);
        socket.on('user:offline', callback);
      }
    },

    // ===== Remove Listeners =====

    /**
     * Stop listening for message receive events
     */
    offMessageReceive() {
      if (socket) {
        socket.off('message:receive');
        listeners.delete('message:receive');
      }
    },

    /**
     * Stop listening for conversation notify events
     */
    offConversationNotify() {
      if (socket) {
        socket.off('conversation:notify');
        listeners.delete('conversation:notify');
      }
    },

    /**
     * Stop listening for messages read events
     */
    offMessagesRead() {
      if (socket) {
        socket.off('messages:read');
        listeners.delete('messages:read');
      }
    },

    /**
     * Stop listening for typing start events
     */
    offTypingStart() {
      if (socket) {
        socket.off('typing:start');
        listeners.delete('typing:start');
      }
    },

    /**
     * Stop listening for typing stop events
     */
    offTypingStop() {
      if (socket) {
        socket.off('typing:stop');
        listeners.delete('typing:stop');
      }
    },

    /**
     * Stop listening for user online events
     */
    offUserOnline() {
      if (socket) {
        socket.off('user:online');
        listeners.delete('user:online');
      }
    },

    /**
     * Stop listening for user offline events
     */
    offUserOffline() {
      if (socket) {
        socket.off('user:offline');
        listeners.delete('user:offline');
      }
    },

    /**
     * Remove all listeners
     */
    offAllListeners() {
      if (socket) {
        socket.off('message:receive');
        socket.off('conversation:notify');
        socket.off('messages:read');
        socket.off('typing:start');
        socket.off('typing:stop');
        socket.off('user:online');
        socket.off('user:offline');
        listeners.clear();
      }
    }
  };
};

export default createSocketWrapper;
