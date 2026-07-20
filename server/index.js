import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import Message from './models/Message.js';
import Conversation from './models/Conversation.js';
import { setIO } from './services/socketRegistry.js';
import { sanitizeMessage } from './services/sanitizationService.js';
import { requestLogger } from './middleware/logging.js';

// Validate required environment variables.
// AWS keys are NOT required: on EC2/Elastic Beanstalk the SDK uses the
// instance role automatically; keys are only needed for local development.
const isProduction = process.env.NODE_ENV === 'production';
const requiredEnvVars = ['JWT_SECRET', 'AWS_S3_BUCKET'];
if (isProduction) {
  requiredEnvVars.push('MONGODB_URI');
}

const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error(`📝 Copy .env.example to .env and fill in the values`);
  process.exit(1);
}

if (!process.env.MONGODB_URI && !isProduction) {
  console.warn('⚠️  MONGODB_URI not set — using local MongoDB (development only)');
}

if (!process.env.AWS_ACCESS_KEY_ID) {
  console.log('ℹ AWS keys not set — using instance role credentials (expected in production)');
}

const app = express();
const httpServer = createServer(app);

// Get CORS origins from environment or use defaults
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000').split(',');

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Make io available to REST controllers (read receipts etc.)
setIO(io);

// Logging Middleware - log all requests
app.use(requestLogger);

// Security Middleware
app.use(helmet()); // Secure HTTP headers

// Rate Limiters — strict in production, generous in development
// (dev traffic comes from one IP with multiple test accounts and hits the API constantly)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 5 : 100,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isProduction ? 3 : 50,
  message: 'Too many OTP requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 5000,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Cookie parser for CSRF protection
app.use(cookieParser());

// CSRF protection using cookies (stores token in XSRF-TOKEN cookie)
const csrfProtection = csrf({ cookie: true });
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https: wss:; media-src 'self' https: data:; object-src 'none'; frame-src 'none';");
  next();
});

app.use(express.json());

// Serve the built React client (copied to server/public by deploy-prep).
// In development this directory doesn't exist and this is a no-op.
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database connection status
let dbConnected = false;

// Track online users
const onlineUsers = new Set();

// Socket.io rate limiting per user per event
const socketRateLimiters = new Map();

const checkSocketRateLimit = (userId, event, limit, windowMs) => {
  const key = `${userId}:${event}`;
  const now = Date.now();

  if (!socketRateLimiters.has(key)) {
    socketRateLimiters.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  const record = socketRateLimiters.get(key);
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
    return false;
  }

  record.count++;
  return record.count > limit;
};

// Cleanup old rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of socketRateLimiters.entries()) {
    if (now > record.resetAt) {
      socketRateLimiters.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Database connection status check middleware
app.use((req, res, next) => {
  if (!dbConnected && req.path !== '/') {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    dbConnected = true;
    console.log('MongoDB connected');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Nexus API running' });
});

// Get online users
app.get('/api/users/online', (req, res) => {
  res.json({ onlineUsers: Array.from(onlineUsers) });
});

// Apply rate limiting to auth endpoints (stricter limits)
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/verify-otp-signup', otpLimiter);

// Apply general API rate limiting
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// SPA fallback: deep links like /chat or /login must serve index.html
// (API and socket paths fall through to their own handlers/404s)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) next(); // no build present (development) — fall through
  });
});

// Socket.io Middleware - Verify JWT
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // Add user to online users set
  onlineUsers.add(socket.userId);

  // Personal room for cross-conversation notifications (unread badges etc.)
  socket.join(`user:${socket.userId}`);
  console.log(`Online users: ${Array.from(onlineUsers).join(', ')}`);

  // User comes online
  socket.emit('user:online', { userId: socket.userId });
  socket.broadcast.emit('user:online', { userId: socket.userId });

  // Join conversation room
  socket.on('conversation:join', async (conversationId) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === socket.userId.toString())) {
        console.log(`🚫 JOIN DENIED: user ${socket.userId} → conversation ${conversationId} (found: ${!!conversation})`);
        socket.emit('error', { message: 'Unauthorized to join this conversation' });
        return;
      }
      socket.join(`conversation:${conversationId}`);
      const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
      console.log(`✓ JOIN: user ${socket.userId} → conversation ${conversationId} (room size now: ${room?.size || 0})`);
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  // Leave conversation room
  socket.on('conversation:leave', async (conversationId) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === socket.userId.toString())) {
        return;
      }
      socket.leave(`conversation:${conversationId}`);
    } catch (error) {
      console.error('Error leaving conversation:', error);
    }
  });

  // Handle incoming message
  socket.on('message:send', async (data, callback) => {
    try {
      // Rate limit: 10 messages per minute per user
      if (checkSocketRateLimit(socket.userId, 'message:send', 10, 60000)) {
        const error = 'Too many messages. Please wait a moment.';
        if (callback) callback({ success: false, error });
        return;
      }

      const { conversationId, content, fileUrl, fileName, fileSize, type, s3Key } = data;

      // Validate required fields
      if (!conversationId || !content) {
        const error = 'Conversation ID and content are required';
        console.error(error);
        if (callback) callback({ success: false, error });
        return;
      }

      // Sanitize message content to prevent XSS
      const sanitizedContent = sanitizeMessage(content);

      // Verify conversation exists and user is a participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        const error = 'Conversation not found';
        console.error(error);
        if (callback) callback({ success: false, error });
        return;
      }

      if (!conversation.participants || !conversation.participants.some(p => p && p.toString() === socket.userId.toString())) {
        const error = 'Not authorized to send message in this conversation';
        console.error(error);
        if (callback) callback({ success: false, error });
        return;
      }

      // SECURITY: Always use socket.userId as sender (never from client data)
      // This prevents message spoofing/impersonation attacks
      const senderId = socket.userId;

      // Create and save message; participants who are online right now
      // count as "delivered" immediately
      const deliveredTo = conversation.participants.filter(p =>
        String(p) !== String(senderId) && onlineUsers.has(String(p))
      );

      const message = new Message({
        conversation: conversationId,
        sender: senderId,
        content: sanitizedContent,
        deliveredTo,
        ...(fileUrl && { fileUrl, fileName, fileSize, type, s3Key })
      });
      await message.save();
      await message.populate('sender', '_id name email publicKey avatar status isOnline');

      // Update conversation's lastMessage
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        lastMessageAt: new Date()
      });

      // Broadcast to conversation room
      const broadcastData = {
        _id: message._id,
        conversation: conversationId,
        sender: message.sender,
        content: message.content,
        createdAt: message.createdAt,
        deliveredTo: message.deliveredTo,
        readBy: message.readBy
      };

      if (fileUrl) {
        broadcastData.fileUrl = message.fileUrl;
        broadcastData.fileName = message.fileName;
        broadcastData.fileSize = message.fileSize;
        broadcastData.type = message.type;
      }

      const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
      console.log(`📤 BROADCAST: conversation ${conversationId} | sender ${socket.userId} | sockets in room: ${room?.size || 0}`);

      io.to(`conversation:${conversationId}`).emit('message:receive', broadcastData);

      // Notify other participants personally (drives unread badges when the
      // recipient doesn't have this conversation open / joined)
      conversation.participants.forEach(participantId => {
        if (String(participantId) !== String(socket.userId)) {
          io.to(`user:${participantId}`).emit('conversation:notify', broadcastData);
        }
      });

      // Acknowledge successful message send
      if (callback) callback({ success: true, messageId: message._id });
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse = { success: false, error: 'Failed to send message' };
      if (callback) callback(errorResponse);
      socket.emit('message:error', errorResponse);
    }
  });

  // Typing indicator
  socket.on('typing:start', async (conversationId) => {
    try {
      // Rate limit: 20 typing events per minute per user
      if (checkSocketRateLimit(socket.userId, 'typing:start', 20, 60000)) {
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === socket.userId.toString())) {
        return;
      }
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId: socket.userId });
    } catch (error) {
      console.error('Error emitting typing:start:', error);
    }
  });

  socket.on('typing:stop', async (conversationId) => {
    try {
      // Rate limit: 20 typing events per minute per user
      if (checkSocketRateLimit(socket.userId, 'typing:stop', 20, 60000)) {
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === socket.userId.toString())) {
        return;
      }
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId: socket.userId });
    } catch (error) {
      console.error('Error emitting typing:stop:', error);
    }
  });

  // Message read receipt
  socket.on('message:read', async (messageId) => {
    try {
      // Rate limit: 50 read receipts per minute per user
      if (checkSocketRateLimit(socket.userId, 'message:read', 50, 60000)) {
        return;
      }

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
    onlineUsers.delete(socket.userId);
    console.log(`Online users: ${Array.from(onlineUsers).join(', ')}`);
    socket.broadcast.emit('user:offline', { userId: socket.userId });
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
