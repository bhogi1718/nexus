import crypto from 'crypto';
import nodemailer from 'nodemailer';
import OTP from '../models/OTP.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const ACCOUNT_LOCK_THRESHOLD = 10;
const ACCOUNT_LOCK_MS = 60 * 60 * 1000;
const isProduction = () => process.env.NODE_ENV === 'production';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

/** A uniformly random 6-digit code from a cryptographically secure source. */
export function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Codes are stored only as a keyed hash: someone who can read the database
// still can't sign in as anyone. Keyed with the server secret so a 6-digit code
// can't be brute-forced offline from the hash alone.
const hashOTP = (email, otp) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${email}:${otp}`).digest('hex');

const matches = (stored, candidate) => {
  const a = Buffer.from(stored, 'hex');
  const b = Buffer.from(candidate, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export async function sendOTPViaEmail(email, otp) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3E2A3A;">Nexus Verification Code</h2>
      <p style="color: #6B4A5E; font-size: 16px;">Your verification code is:</p>
      <div style="background: #F2D7DC; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #3E2A3A;">${otp}</span>
      </div>
      <p style="color: #6B4A5E; font-size: 14px;">This code expires in <strong>5 minutes</strong>. Never share it with anyone.</p>
      <p style="color: #7A5668; font-size: 12px; margin-top: 20px;">If you didn't request this code, you can ignore this email.</p>
    </div>
  `;

  try {
    const info = await getTransporter().sendMail({
      from: `"Nexus" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your Nexus verification code',
      html: htmlContent,
      text: `Your Nexus verification code is ${otp}. It expires in 5 minutes. Never share it with anyone.`,
    });
    console.log(`OTP email sent | MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Failed to send OTP email:', error.message);
    throw new Error('We could not send the code email. Please try again.');
  }
}

export async function generateAndSaveOTP(email) {
  const emailLower = email.toLowerCase();
  await OTP.deleteMany({ email: emailLower });

  const otp = generateOTP();
  const otpDoc = await OTP.create({
    email: emailLower,
    otp: hashOTP(emailLower, otp),
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });

  if (isProduction()) {
    await sendOTPViaEmail(emailLower, otp);
  } else {
    // Development only. A code in production logs is a login for anyone who can read them.
    console.log(`[DEV] OTP for ${emailLower}: ${otp}`);
  }

  return otpDoc;
}

const recordFailure = async (User, user) => {
  if (!user) return;
  const failures = (user.failedOtpAttempts || 0) + 1;
  if (failures >= ACCOUNT_LOCK_THRESHOLD) {
    await User.update(user.userId, {
      failedOtpAttempts: failures,
      accountLockoutUntil: new Date(Date.now() + ACCOUNT_LOCK_MS).toISOString(),
    });
    throw new Error('Account temporarily locked due to too many failed attempts. Try again in 1 hour.');
  }
  await User.update(user.userId, { failedOtpAttempts: failures });
};

/**
 * Verifies a code. Returns true/false; throws when the account is locked.
 * Each check consumes an attempt atomically, and a correct code is single-use:
 * only the request that actually deletes it succeeds.
 */
export async function verifyOTP(email, otp) {
  const User = (await import('../models/User.js')).default;
  const emailLower = String(email).toLowerCase();

  const user = await User.findByEmail(emailLower);
  if (user?.accountLockoutUntil && new Date(user.accountLockoutUntil) > new Date()) {
    const minutes = Math.ceil((new Date(user.accountLockoutUntil) - new Date()) / 60000);
    throw new Error(`Account temporarily locked. Try again in ${minutes} minutes.`);
  }

  const otpDoc = await OTP.findOne({ email: emailLower });
  if (!otpDoc) return false;

  if (new Date(otpDoc.expiresAt) < new Date()) {
    await OTP.deleteOne({ otpId: otpDoc.otpId });
    return false;
  }

  const attempt = await OTP.consumeAttempt(otpDoc.otpId);
  if (!attempt) {
    await OTP.deleteOne({ otpId: otpDoc.otpId });
    await recordFailure(User, user);
    return false;
  }

  if (!matches(otpDoc.otp, hashOTP(emailLower, String(otp ?? '')))) {
    await recordFailure(User, user);
    return false;
  }

  const { deletedCount } = await OTP.deleteOne({ otpId: otpDoc.otpId });
  if (deletedCount !== 1) return false; // already used by a concurrent request

  if (user) {
    await User.update(user.userId, { failedOtpAttempts: 0, accountLockoutUntil: null });
  }
  return true;
}

export default {
  generateOTP,
  sendOTPViaEmail,
  generateAndSaveOTP,
  verifyOTP,
};
