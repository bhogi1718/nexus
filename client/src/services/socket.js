import { io } from 'socket.io-client';
import { authAPI } from './api';

// Derive the socket host from the API URL:
// - absolute URL (http://host/api) → strip /api
// - relative URL (/api, production same-origin) → current origin
// - unset, or relative in local dev → the dev backend (the Vite server has no socket)
const DEV_BACKEND = 'http://localhost:5000';
const rawApiUrl = import.meta.env.VITE_API_URL;
const SOCKET_URL = rawApiUrl && rawApiUrl.startsWith('http')
  ? rawApiUrl.replace(/\/api\/?$/, '')
  : (rawApiUrl && !import.meta.env.DEV ? window.location.origin : DEV_BACKEND);

let socket = null;
// Rejoined after every reconnect: server-side room membership is lost whenever
// the socket drops, and without this live messages silently stop.
let currentConversationId = null;

// Listeners live here rather than on the socket, so they survive the socket
// being created later or recreated after logout/login.
const listeners = new Map();
const attached = new Set();

const dispatch = (event, payload) => {
  listeners.get(event)?.forEach(handler => {
    try {
      handler(payload);
    } catch (err) {
      console.error(`Socket handler for "${event}" failed:`, err);
    }
  });
};

const attach = (event) => {
  if (!socket || attached.has(event)) return;
  socket.on(event, (payload) => dispatch(event, payload));
  attached.add(event);
};

/** Subscribe to a server event. Returns an unsubscribe function. */
export const subscribe = (event, handler) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  attach(event);
  return () => listeners.get(event)?.delete(handler);
};

// Synthetic event for the UI: 'connected' | 'reconnecting' | 'offline'.
let connectionStatus = 'offline';
const setStatus = (status) => {
  if (status === connectionStatus) return;
  connectionStatus = status;
  dispatch('connection:status', status);
};
export const getConnectionStatus = () => connectionStatus;

export const initializeSocket = () => {
  // Reuse an existing socket whether connected OR still connecting.
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    // A function, so every reconnect reads the current token. Access tokens
    // expire after an hour; a captured string would make reconnects fail forever.
    auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling'],
  });

  attached.clear();
  listeners.forEach((_, event) => attach(event));

  socket.on('connect', () => {
    setStatus('connected');
    if (currentConversationId) socket.emit('conversation:join', currentConversationId);
  });

  socket.on('disconnect', (reason) => {
    // The server closing us on purpose (e.g. logout elsewhere) won't auto-retry.
    setStatus(reason === 'io client disconnect' ? 'offline' : 'reconnecting');
    if (reason === 'io server disconnect') socket.connect();
  });

  socket.io.on('reconnect_attempt', () => setStatus('reconnecting'));

  socket.on('connect_error', async (error) => {
    setStatus('reconnecting');
    if (error?.message === 'Invalid token') {
      // Let the HTTP layer refresh the access token, then retry with it.
      try {
        await authAPI.getProfile();
        socket?.connect();
      } catch {
        // The refresh interceptor handles a dead session (redirect to login).
      }
    }
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  currentConversationId = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  attached.clear();
  setStatus('offline');
};

export const joinConversation = (conversationId) => {
  currentConversationId = conversationId;
  socket?.emit('conversation:join', conversationId);
};

export const leaveConversation = (conversationId) => {
  if (currentConversationId === conversationId) currentConversationId = null;
  socket?.emit('conversation:leave', conversationId);
};

export const sendMessage = (conversationId, content, { clientId, media } = {}) => new Promise((resolve, reject) => {
  if (!socket?.connected) {
    reject(new Error('You are offline. The message will be kept so you can retry.'));
    return;
  }

  const payload = { conversationId, content, clientId };
  if (media) {
    payload.fileUrl = media.fileUrl;
    payload.fileName = media.fileName;
    payload.fileSize = media.fileSize;
    payload.type = media.type;
    payload.s3Key = media.s3Key;
  }

  // Without a timeout a send lost mid-reconnect would spin forever.
  const timer = setTimeout(() => reject(new Error('Sending timed out')), 15000);
  socket.emit('message:send', payload, (response) => {
    clearTimeout(timer);
    if (response?.success) resolve(response);
    else reject(new Error(response?.error || 'Failed to send message'));
  });
});

export const startTyping = (conversationId) => socket?.emit('typing:start', conversationId);
export const stopTyping = (conversationId) => socket?.emit('typing:stop', conversationId);

/** Confirms to the server that these messages reached this device. */
export const confirmDelivered = (messageIds) => {
  if (messageIds?.length) socket?.emit('message:delivered', { messageIds });
};

/** Marks every incoming message in the conversation as read. */
export const markConversationRead = (conversationId) => {
  if (conversationId) socket?.emit('conversation:read', conversationId);
};
