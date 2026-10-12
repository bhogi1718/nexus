// Holds the Socket.io server instance so REST controllers can emit events
// without importing index.js (which would be a circular import).
let io = null;

export const setIO = (instance) => {
  io = instance;
};

export const getIO = () => io;

// Presence is counted per connection, not per user: someone with the app open in
// two tabs must stay online when they close one of them.
const connections = new Map();

/** Returns true when this is the user's first open connection. */
export const addConnection = (userId) => {
  const count = (connections.get(userId) || 0) + 1;
  connections.set(userId, count);
  return count === 1;
};

/** Returns true when the user's last open connection just closed. */
export const removeConnection = (userId) => {
  const count = (connections.get(userId) || 0) - 1;
  if (count <= 0) {
    connections.delete(userId);
    return true;
  }
  connections.set(userId, count);
  return false;
};

export const isUserOnline = (userId) => connections.has(String(userId));

export const emitToUser = (userId, event, payload) => {
  io?.to(`user:${userId}`).emit(event, payload);
};
