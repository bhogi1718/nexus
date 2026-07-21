import bcrypt from 'bcryptjs';
import User from '../models/User.js';
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
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
};

// Verify OTP and register user (Passwordless)
export const verifyOTPAndRegister = async (req, res) => {
  try {
    const { name, email, otp, publicKey, secretKey } = req.body;

    // Validate inputs
    if (!name || !email || !otp || !publicKey) {
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
      publicKey,
      secretKey: secretKey || null,
      isEmailVerified: true
    });

    const { accessToken, refreshToken } = generateTokens(newUser.userId);

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        status: newUser.status
      }
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
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
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

    // Find user (encryption keys are always included in DynamoDB)
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Email not found' });
    }

    const { accessToken, refreshToken } = generateTokens(user.userId);

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        publicKey: user.publicKey,
        secretKey: user.secretKey
      }
    });
  } catch (error) {
    console.error('Verify OTP and login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Legacy email+password signup (kept for backward compatibility)
export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, publicKey } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!publicKey) {
      return res.status(400).json({ message: 'Encryption key required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      publicKey
    });

    const { accessToken, refreshToken } = generateTokens(newUser._id);

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user.userId);

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};

export const getProfile = async (req, res) => {
  try {
    // Encryption keys are always included in DynamoDB responses
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        publicKey: user.publicKey,
        secretKey: user.secretKey
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Sync this device's keypair to the server (used when the server has none yet)
export const updatePublicKey = async (req, res) => {
  try {
    const { publicKey, secretKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ message: 'Public key is required' });
    }

    const update = { publicKey };
    if (secretKey) {
      update.secretKey = secretKey;
    }

    const user = await User.findByIdAndUpdate(req.userId, update);

    res.status(200).json({
      message: 'Keys updated successfully',
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        publicKey: user.publicKey
      }
    });
  } catch (error) {
    console.error('Update keys error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
