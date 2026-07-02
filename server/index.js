import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import Message from './models/Message.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/messenger')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Nexus API running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Socket.io Middleware - Verify JWT
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here');
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // User comes online
  socket.emit('user:online', { userId: socket.userId });
  socket.broadcast.emit('user:online', { userId: socket.userId });

  // Join conversation room
  socket.on('conversation:join', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('conversation:leave', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // Handle incoming message
  socket.on('message:send', async (data) => {
    try {
      const { conversationId, content } = data;

      // Create and save message
      const message = new Message({
        conversation: conversationId,
        sender: socket.userId,
        content,
        deliveredTo: []
      });
      await message.save();
      await message.populate('sender', '-password');

      // Broadcast to conversation room
      io.to(`conversation:${conversationId}`).emit('message:receive', {
        _id: message._id,
        conversation: conversationId,
        sender: message.sender,
        content: message.content,
        createdAt: message.createdAt
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing:start', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:start', {
      userId: socket.userId
    });
  });

  socket.on('typing:stop', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
      userId: socket.userId
    });
  });

  // Message read receipt
  socket.on('message:read', async (messageId) => {
    try {
      const message = await Message.findById(messageId);
      if (message) {
        const alreadyRead = message.readBy.some(r => r.user.toString() === socket.userId.toString());
        if (!alreadyRead) {
          message.readBy.push({ user: socket.userId });
          await message.save();
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // User goes offline
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    socket.broadcast.emit('user:offline', { userId: socket.userId });
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
