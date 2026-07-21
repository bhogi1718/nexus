import { v4 as uuidv4 } from 'uuid';
import db, { TABLES } from '../services/dynamodb.js';

export class OTP {
  static async create(data) {
    const otp = {
      otpId: data.otpId || uuidv4(),
      email: data.email,
      otp: data.otp,
      attempts: data.attempts || 0,
      maxAttempts: data.maxAttempts || 5,
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString()
    };

    return await db.put(TABLES.OTPS, otp);
  }

  static async findOne(filter) {
    if (!filter || !filter.email) {
      return null;
    }

    const otps = await db.query(
      TABLES.OTPS,
      'email = :email',
      {},
      { ':email': filter.email.toLowerCase() },
      'email-index'
    );

    return otps[0] || null;
  }

  static async deleteMany(filter) {
    if (filter && filter.email) {
      const otps = await db.query(
        TABLES.OTPS,
        'email = :email',
        {},
        { ':email': filter.email.toLowerCase() },
        'email-index'
      );

      for (const otp of otps) {
        await db.delete(TABLES.OTPS, { otpId: otp.otpId });
      }

      return { deletedCount: otps.length };
    }

    return { deletedCount: 0 };
  }

  static async deleteOne(filter) {
    if (filter._id) {
      await db.delete(TABLES.OTPS, { otpId: filter._id });
      return { deletedCount: 1 };
    }

    const otp = await this.findOne(filter);
    if (otp) {
      await db.delete(TABLES.OTPS, { otpId: otp.otpId });
      return { deletedCount: 1 };
    }

    return { deletedCount: 0 };
  }

  static async save(otp) {
    return await db.put(TABLES.OTPS, otp);
  }
}

export default OTP;
