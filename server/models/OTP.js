import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const otpSchema = new mongoose.Schema({
  otpId: { type: String, default: uuidv4, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, index: true },
  otp: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false });

// Mongo auto-removes expired OTP docs; verifyOTP still checks expiry explicitly
// because TTL deletion runs on a ~60s cycle.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTPModel = mongoose.model('OTP', otpSchema);

const toPlain = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject();
  delete obj._id;
  obj.expiresAt = obj.expiresAt instanceof Date ? obj.expiresAt.toISOString() : obj.expiresAt;
  return obj;
};

export class OTP {
  static async create(data) {
    return toPlain(await OTPModel.create({ ...data, email: data.email.toLowerCase() }));
  }

  static async findOne(filter) {
    if (!filter?.email) return null;
    return toPlain(await OTPModel.findOne({ email: filter.email.toLowerCase() }).sort({ createdAt: -1 }));
  }

  static async update(otpId, updates) {
    return toPlain(await OTPModel.findOneAndUpdate({ otpId }, { $set: updates }, { new: true }));
  }

  static async deleteMany(filter) {
    if (!filter?.email) return { deletedCount: 0 };
    const result = await OTPModel.deleteMany({ email: filter.email.toLowerCase() });
    return { deletedCount: result.deletedCount };
  }

  static async deleteOne(filter) {
    const id = filter?.otpId || filter?._id;
    if (id) {
      const result = await OTPModel.deleteOne({ otpId: id });
      return { deletedCount: result.deletedCount };
    }
    if (filter?.email) {
      const result = await OTPModel.deleteOne({ email: filter.email.toLowerCase() });
      return { deletedCount: result.deletedCount };
    }
    return { deletedCount: 0 };
  }

  static async save(otp) {
    const { otpId, ...rest } = otp;
    return this.update(otpId, rest);
  }
}

export default OTP;
