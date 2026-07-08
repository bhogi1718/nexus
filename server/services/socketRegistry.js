// Holds the Socket.io server instance so REST controllers can emit events
// without importing index.js (which would be a circular import).
let io = null;

export const setIO = (instance) => {
  io = instance;
};

export const getIO = () => io;
