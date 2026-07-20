import express from 'express';
import { body, validationResult } from 'express-validator';
import csrf from 'csurf';
import { register, login, logout, getProfile, sendOTP, verifyOTPAndRegister, sendOTPLogin, verifyOTPAndLogin, updatePublicKey } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { verifyRefreshToken, generateTokens } from '../services/tokenService.js';

const router = express.Router();
const csrfProtection = csrf({ cookie: true });

// Validation middleware
const validateEmail = body('email').isEmail().normalizeEmail().withMessage('Valid email is required');
const validatePassword = body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters');
const validateName = body('name').trim().isLength({ min: 2 }).escape().withMessage('Name must be at least 2 characters');

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

// Legacy email+password signup (backward compatibility)
router.post('/register',
  validateName,
  validateEmail,
  validatePassword,
  body('confirmPassword').isLength({ min: 6 }).withMessage('Confirm password is required'),
  body('publicKey').notEmpty().withMessage('Public key is required'),
  handleValidationErrors,
  register
);

// Legacy email+password login (backward compatibility)
router.post('/login',
  validateEmail,
  validatePassword,
  handleValidationErrors,
  login
);

router.post('/logout', verifyToken, logout);
router.get('/profile', verifyToken, getProfile);
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
    res.status(401).json({ message: 'Invalid refresh token', error: error.message });
  }
});

export default router;
