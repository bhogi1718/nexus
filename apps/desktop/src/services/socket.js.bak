import { io } from 'socket.io-client';

// Derive the socket host from the API URL:
// - absolute URL (http://host/api) → strip /api
// - relative URL (/api, production same-origin) → current origin
// - unset (local dev) → the dev backend
const rawApiUrl = import.meta.env.VITE_API_URL;
const SOCKET_URL = rawApiUrl
  ? (rawApiUrl.startsWith('http')
      ? rawApiUrl.replace('/api', '')
      : window.location.origin)
  : 'http://localhost:5000';

let socket = null;
// Track the open conversation so we can rejoin its room after a reconnect
// (server-side room membership is lost every time the socket disconnects,
// e.g. on a server restart — without this, live messages silently stop)
let currentConversationId = null;

export const initializeSocket = (token) => {
  // Reuse an existing socket whether connected OR still connecting —
  // recreating it would orphan every listener registered on the old one
  // (login calls this twice in quick succession)
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
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    // Rejoin the active conversation room after any (re)connect
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
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  currentConversationId = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (conversationId) => {
  currentConversationId = conversationId;
  if (socket) {
    socket.emit('conversation:join', conversationId);
  }
};

export const leaveConversation = (conversationId) => {
  if (currentConversationId === conversationId) {
    currentConversationId = null;
  }
  if (socket) {
    socket.emit('conversation:leave', conversationId);
  }
};

export const sendMessage = (conversationId, content, mediaData = null) => {
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

export const onConversationNotify = (callback) => {
  if (socket) {
    socket.on('conversation:notify', callback);
  }
};

export const offConversationNotify = () => {
  if (socket) {
    socket.off('conversation:notify');
  }
};

export const onMessagesRead = (callback) => {
  if (socket) {
    socket.on('messages:read', callback);
  }
};

export const offMessagesRead = () => {
  if (socket) {
    socket.off('messages:read');
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

export const offUserOnline = () => {
  if (socket) {
    socket.off('user:online');
  }
};

export const offUserOffline = () => {
  if (socket) {
    socket.off('user:offline');
  }
};

export const offAllListeners = () => {
  if (socket) {
    socket.off('message:receive');
    socket.off('typing:start');
    socket.off('typing:stop');
    socket.off('user:online');
    socket.off('user:offline');
  }
};
