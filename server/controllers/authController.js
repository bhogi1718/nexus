import User from '../models/User.js';
import { sanitizeInput } from '../services/sanitizationService.js';

// The signed-in user's own record, including their privacy settings.
const formatSelf = (user) => ({
  id: user.userId,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  status: user.status,
  // Public identity key only; used to detect that this device's keys were replaced.
  identityKeyDh: user.identityKeyDh || null,
  createdAt: user.createdAt,
  settings: {
    readReceipts: user.settings?.readReceipts !== false,
    showLastSeen: user.settings?.showLastSeen !== false,
  },
});
import { generateAndSaveOTP, verifyOTP } from '../services/emailOtpService.js';
import { generateTokens, verifyRefreshToken } from '../services/tokenService.js';

// Send OTP for signup
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if email already exists and is verified
    const existingUser = await User.findByEmail(email);
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate and send OTP
    await generateAndSaveOTP(email);

    res.status(200).json({ message: 'OTP sent successfully', email });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'We could not send a code right now. Please try again.' });
  }
};

// Verify OTP and register user (Passwordless)
export const verifyOTPAndRegister = async (req, res) => {
  try {
    const { name, email, otp } = req.body;

    // Validate inputs
    if (!name || !email || !otp) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify OTP (may throw error if account is locked)
    try {
      const isOTPValid = await verifyOTP(email, otp);
      if (!isOTPValid) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
    } catch (lockoutError) {
      return res.status(429).json({ message: lockoutError.message });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user (no password)
    const newUser = await User.create({
      name,
      email,
      isEmailVerified: true
    });

    const { accessToken, refreshToken } = generateTokens(newUser.userId);

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: formatSelf(newUser)
    });
  } catch (error) {
    console.error('Verify OTP and register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send OTP for login
export const sendOTPLogin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if email exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Email not registered' });
    }

    // Generate and send OTP
    await generateAndSaveOTP(email);

    res.status(200).json({ message: 'OTP sent successfully', email });
  } catch (error) {
    console.error('Send OTP login error:', error);
    res.status(500).json({ message: 'We could not send a code right now. Please try again.' });
  }
};

// Verify OTP and login (Passwordless)
export const verifyOTPAndLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP (may throw error if account is locked)
    try {
      const isOTPValid = await verifyOTP(email, otp);
      if (!isOTPValid) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
    } catch (lockoutError) {
      return res.status(429).json({ message: lockoutError.message });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Email not found' });
    }

    const { accessToken, refreshToken } = generateTokens(user.userId);

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: formatSelf(user)
    });
  } catch (error) {
    console.error('Verify OTP and login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user: formatSelf(user) });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update the caller's own display name / status
export const updateProfile = async (req, res) => {
  try {
    const { name, status } = req.body;
    const updates = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2 || trimmed.length > 50) {
        return res.status(400).json({ message: 'Name must be between 2 and 50 characters' });
      }
      updates.name = sanitizeInput(trimmed);
    }

    if (status !== undefined) {
      const trimmed = String(status).trim();
      if (trimmed.length > 140) {
        return res.status(400).json({ message: 'Status must be 140 characters or fewer' });
      }
      updates.status = sanitizeInput(trimmed);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const user = await User.update(req.userId, updates);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated', user: formatSelf(user) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Privacy settings: read receipts and last-seen visibility (both reciprocal).
export const updateSettings = async (req, res) => {
  try {
    const updates = {};
    for (const key of ['readReceipts', 'showLastSeen']) {
      if (req.body[key] === undefined) continue;
      if (typeof req.body[key] !== 'boolean') {
        return res.status(400).json({ message: `${key} must be true or false` });
      }
      updates[`settings.${key}`] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const user = await User.update(req.userId, updates);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'Settings updated', user: formatSelf(user) });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

