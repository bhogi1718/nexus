import express from 'express';
import { body, validationResult } from 'express-validator';
import csrf from 'csurf';
import { logout, getProfile, sendOTP, verifyOTPAndRegister, sendOTPLogin, verifyOTPAndLogin, updatePublicKey, updateProfile, updateSettings } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { verifyRefreshToken, generateTokens } from '../services/tokenService.js';

const router = express.Router();
const csrfProtection = csrf({ cookie: true });

// Validation middleware.
// Emails are only trimmed and lower-cased — not normalizeEmail(), which strips
// Gmail dots/+tags at signup and then fails to match the address people type
// when adding a contact.
// Names are not HTML-escaped: React escapes on render, and escaping here would
// store "D'Souza" as "D&#x27;Souza".
const validateEmail = body('email').trim().toLowerCase().isEmail().withMessage('Valid email is required');
const validateName = body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters');

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
};

// Email OTP Signup - Send OTP
router.post('/send-otp',
  validateEmail,
  handleValidationErrors,
  sendOTP
);

// Email OTP Signup - Verify OTP and Register
router.post('/verify-otp-signup',
  validateName,
  validateEmail,
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('publicKey').notEmpty().withMessage('Public key is required'),
  handleValidationErrors,
  verifyOTPAndRegister
);

// Email OTP Login - Send OTP
router.post('/send-otp-login',
  validateEmail,
  handleValidationErrors,
  sendOTPLogin
);

// Email OTP Login - Verify OTP and Login
router.post('/verify-otp-login',
  validateEmail,
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  handleValidationErrors,
  verifyOTPAndLogin
);

router.post('/logout', verifyToken, logout);
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, updateProfile);
router.patch('/settings', verifyToken, updateSettings);
router.post('/update-public-key', verifyToken, updatePublicKey);

// Refresh token endpoint
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
});

export default router;
