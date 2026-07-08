import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Auto-delete after expiry
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('OTP', otpSchema);
