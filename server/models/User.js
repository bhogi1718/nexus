import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const userSchema = new mongoose.Schema({
  userId: { type: String, default: uuidv4, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  password: { type: String, default: null },
  isEmailVerified: { type: Boolean, default: false },
  avatar: { type: String, default: null },
  status: { type: String, default: "Hey there! I'm using Nexus" },
  publicKey: { type: String, default: null },
  secretKey: { type: String, default: null },
  contacts: { type: [String], default: [] },
  contactNicknames: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  blockedUsers: { type: [String], default: [] },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: String, default: () => new Date().toISOString() },
  accountLockoutUntil: { type: String, default: null },
  failedOtpAttempts: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false });

const UserModel = mongoose.model('User', userSchema);

const toPlain = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject();
  delete obj._id;
  return obj;
};

export class User {
  static async create(data) {
    const doc = await UserModel.create({
      ...data,
      email: data.email.toLowerCase()
    });
    return toPlain(doc);
  }

  static async findById(userId) {
    return toPlain(await UserModel.findOne({ userId }));
  }

  static async findByEmail(email) {
    if (!email) return null;
    return toPlain(await UserModel.findOne({ email: email.toLowerCase() }));
  }

  static async findByIdWithSecretKey(userId) {
    return this.findById(userId);
  }

  static async update(userId, updates) {
    const doc = await UserModel.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true }
    );
    return toPlain(doc);
  }

  static async findByIdAndUpdate(userId, updates) {
    return this.update(userId, updates);
  }

  static async addContact(userId, contactId) {
    const doc = await UserModel.findOneAndUpdate(
      { userId },
      { $addToSet: { contacts: contactId } },
      { new: true }
    );
    if (!doc) throw new Error('User not found');
    return toPlain(doc);
  }

  static async removeContact(userId, contactId) {
    const doc = await UserModel.findOneAndUpdate(
      { userId },
      { $pull: { contacts: contactId } },
      { new: true }
    );
    if (!doc) throw new Error('User not found');
    return toPlain(doc);
  }

  static async setContactNickname(userId, contactId, nickname) {
    const op = nickname
      ? { $set: { [`contactNicknames.${contactId}`]: nickname } }
      : { $unset: { [`contactNicknames.${contactId}`]: '' } };
    const doc = await UserModel.findOneAndUpdate({ userId }, op, { new: true });
    if (!doc) throw new Error('User not found');
    return toPlain(doc);
  }
}

export default User;
