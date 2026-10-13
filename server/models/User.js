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
  // Public key material only. Private keys never leave the device that created them.
  identityKeyDh: { type: String, default: null },
  identityKeySig: { type: String, default: null },
  signedPreKey: {
    keyId: { type: Number, default: null },
    publicKey: { type: String, default: null },
    signature: { type: String, default: null },
  },
  oneTimePreKeys: { type: [{ _id: false, keyId: Number, publicKey: String }], default: [] },
  contacts: { type: [String], default: [] },
  contactNicknames: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  blockedUsers: { type: [String], default: [] },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: String, default: () => new Date().toISOString() },
  accountLockoutUntil: { type: String, default: null },
  failedOtpAttempts: { type: Number, default: 0 },
  settings: {
    readReceipts: { type: Boolean, default: true },
    showLastSeen: { type: Boolean, default: true },
  },
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

  /** Batch lookup, returned as a Map keyed by userId. */
  static async findManyByIds(userIds) {
    const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
    if (!ids.length) return new Map();
    const docs = await UserModel.find({ userId: { $in: ids } });
    return new Map(docs.map(d => [d.userId, toPlain(d)]));
  }

  /** userIds of everyone who has `userId` in their contact list. */
  static async findIdsWithContact(userId) {
    const docs = await UserModel.find({ contacts: userId }, { userId: 1 });
    return docs.map(d => d.userId);
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

  static async publishKeys(userId, bundle) {
    const doc = await UserModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          identityKeyDh: bundle.identityKeyDh,
          identityKeySig: bundle.identityKeySig,
          signedPreKey: bundle.signedPreKey,
          oneTimePreKeys: bundle.oneTimePreKeys,
        },
      },
      { new: true }
    );
    return toPlain(doc);
  }

  static async addOneTimePreKeys(userId, keys, cap) {
    const current = await UserModel.findOne({ userId }, { oneTimePreKeys: 1 });
    if (!current) return null;
    const combined = [...current.oneTimePreKeys.map(k => ({ keyId: k.keyId, publicKey: k.publicKey })), ...keys];
    const kept = combined.slice(-cap);
    const doc = await UserModel.findOneAndUpdate({ userId }, { $set: { oneTimePreKeys: kept } }, { new: true });
    return toPlain(doc);
  }

  static async countOneTimePreKeys(userId) {
    const doc = await UserModel.findOne({ userId }, { oneTimePreKeys: 1 });
    return doc?.oneTimePreKeys?.length || 0;
  }

  /**
   * Takes one one-time prekey out of the pool. Retries if another request claimed
   * the same key first, so no key is ever handed to two people.
   */
  static async claimOneTimePreKey(userId) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const doc = await UserModel.findOne({ userId }, { oneTimePreKeys: 1 });
      const candidate = doc?.oneTimePreKeys?.[0];
      if (!candidate) return null;
      const won = await UserModel.findOneAndUpdate(
        { userId, 'oneTimePreKeys.keyId': candidate.keyId },
        { $pull: { oneTimePreKeys: { keyId: candidate.keyId } } }
      );
      if (won) return { keyId: candidate.keyId, publicKey: candidate.publicKey };
    }
    return null;
  }

  static async findKeyMaterial(userId) {
    const doc = await UserModel.findOne({ userId }, { identityKeyDh: 1, identityKeySig: 1, signedPreKey: 1 });
    return doc ? toPlain(doc) : null;
  }
}

export default User;
