import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export const initializeSocket = (token) => {
  if (socket) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (conversationId) => {
  if (socket) {
    socket.emit('conversation:join', conversationId);
  }
};

export const leaveConversation = (conversationId) => {
  if (socket) {
    socket.emit('conversation:leave', conversationId);
  }
};

export const sendMessage = (conversationId, content) => {
  if (socket) {
    socket.emit('message:send', { conversationId, content });
  }
};

export const startTyping = (conversationId) => {
  if (socket) {
    socket.emit('typing:start', conversationId);
  }
};

export const stopTyping = (conversationId) => {
  if (socket) {
    socket.emit('typing:stop', conversationId);
  }
};

export const markMessageAsRead = (messageId) => {
  if (socket) {
    socket.emit('message:read', messageId);
  }
};

export const onMessageReceive = (callback) => {
  if (socket) {
    socket.on('message:receive', callback);
  }
};

export const onTypingStart = (callback) => {
  if (socket) {
    socket.on('typing:start', callback);
  }
};

export const onTypingStop = (callback) => {
  if (socket) {
    socket.on('typing:stop', callback);
  }
};

export const onUserOnline = (callback) => {
  if (socket) {
    socket.on('user:online', callback);
  }
};

export const onUserOffline = (callback) => {
  if (socket) {
    socket.on('user:offline', callback);
  }
};

export const offMessageReceive = () => {
  if (socket) {
    socket.off('message:receive');
  }
};

export const offTypingStart = () => {
  if (socket) {
    socket.off('typing:start');
  }
};

export const offTypingStop = () => {
  if (socket) {
    socket.off('typing:stop');
  }
};
