import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import keyRoutes from './routes/keyRoutes.js';
import { setIO } from './services/socketRegistry.js';
import { registerRealtime } from './services/realtime.js';
import { connectDB, isDBConnected } from './services/db.js';
import { requestLogger } from './middleware/logging.js';

const isProduction = process.env.NODE_ENV === 'production';
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];
// OTP emails are only sent in production; dev logs the code to the console.
if (isProduction) requiredEnvVars.push('GMAIL_USER', 'GMAIL_APP_PASSWORD');

const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error(`📝 Copy .env.example to .env and fill in the values`);
  process.exit(1);
}

const app = express();

// Render (and most hosts) put one proxy in front of the app. Without this every
// request appears to come from the proxy's IP, so the rate limiters would put
// all users in one shared bucket and lock everyone out together.
if (isProduction) app.set('trust proxy', 1);
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

// Sending and checking codes have separate budgets: with one shared counter a
// single mistyped code could block requesting a new one.
const sendCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 100,
  message: { message: 'Too many code requests. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Per IP. Per-code (5 guesses) and per-account (10 failures → 1h lock) limits in
// emailOtpService stop guessing; this stops one client hammering many accounts.
const verifyCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 200,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Chatting itself runs over the socket; this covers REST browsing (opening
// chats, profiles, contacts), which a normal session easily makes hundreds of.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 1000 : 10000,
  message: { message: 'Too many requests. Please slow down and try again shortly.' },
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

// CSRF protection: skip for JWT-authenticated requests (API endpoints)
// CSRF is mainly for form attacks; JWT provides sufficient protection for APIs
const csrfProtection = csrf({ cookie: true });

// Middleware to skip CSRF for requests with valid JWT
const csrfSkipIfAuthed = (req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next(); // Skip CSRF for authenticated requests
  }
  csrfProtection(req, res, next);
};

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
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: wss:; media-src 'self' https: data:; object-src 'none'; frame-src 'none';");
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  if (!isDBConnected() && req.path !== '/' && req.path !== '/api/health') {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Nexus API running' });
});

app.get('/api/health', (req, res) => {
  const dbUp = isDBConnected();
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'connected' : 'disconnected' });
});

// app.use matches path prefixes on segment boundaries, so '/send-otp' does NOT
// cover '/send-otp-login' — each OTP route has to be listed.
app.use('/api/auth/send-otp', sendCodeLimiter);
app.use('/api/auth/send-otp-login', sendCodeLimiter);
app.use('/api/auth/verify-otp-signup', verifyCodeLimiter);
app.use('/api/auth/verify-otp-login', verifyCodeLimiter);

// Apply general API rate limiting
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/keys', keyRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

registerRealtime(io);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
