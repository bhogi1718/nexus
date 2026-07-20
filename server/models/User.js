import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: null
  },
  status: {
    type: String,
    default: 'Hey there! I\'m using Nexus'
  },
  publicKey: {
    type: String,
    default: null
  },
  // Encryption secret key, stored so users can decrypt from any device/session.
  // select:false keeps it out of ALL queries and populates (participants,
  // message senders, search results) unless explicitly requested with '+secretKey'.
  secretKey: {
    type: String,
    default: null,
    select: false
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Personal nicknames for contacts, keyed by contact user id.
  // Only visible to this user — the contact keeps their real name for others.
  contactNicknames: {
    type: Map,
    of: String,
    default: {}
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  accountLockoutUntil: {
    type: Date,
    default: null
  },
  failedOtpAttempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('User', userSchema);
