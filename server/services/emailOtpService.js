import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import OTP from '../models/OTP.js';

let sesClient = null;

function getSESClient() {
  if (!sesClient) {
    const config = { region: process.env.AWS_REGION || 'us-east-1' };
    // Explicit credentials only for local dev; production uses the instance role
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    }
    sesClient = new SESClient(config);
  }
  return sesClient;
}

/**
 * Generate a random 6-digit OTP
 * @returns {string} Generated OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via AWS SES
 * @param {string} email - Email address
 * @param {string} otp - OTP to send
 * @returns {Promise} SES response
 */
export async function sendOTPViaEmail(email, otp) {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Nexus Verification Code</h2>
        <p style="color: #666; font-size: 16px;">Your verification code is:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code is <strong>6 digits</strong> and expires in <strong>5 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;

    const params = {
      Source: process.env.AWS_SES_EMAIL || 'noreply@nexus-messenger.com',
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: 'Your Nexus Verification Code',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: 'UTF-8'
          }
        }
      }
    };

    const command = new SendEmailCommand(params);
    const response = await getSESClient().send(command);
    console.log(`✓ OTP sent to ${email} | MessageId: ${response.MessageId}`);
    return response;
  } catch (error) {
    console.error('❌ Failed to send OTP via SES:', error.message);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
}

/**
 * Generate and save OTP for email
 * @param {string} email - Email address
 * @returns {Promise} OTP object
 */
export async function generateAndSaveOTP(email) {
  try {
    // Delete any existing OTP for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const otpDoc = await OTP.create({
      email: email.toLowerCase(),
      otp,
      expiresAt
    });

    console.log(`📧 OTP generated for ${email}: ${otp}`);

    // Try to send via SES, but don't fail if it doesn't work (dev mode)
    if (process.env.NODE_ENV === 'production') {
      await sendOTPViaEmail(email, otp);
    } else {
      // Development: log the OTP to console instead of sending
      console.log(`💡 [DEV MODE] Use OTP: ${otp}`);
    }

    return otpDoc;
  } catch (error) {
    console.error('❌ Error generating OTP:', error.message);
    throw error;
  }
}

/**
 * Verify OTP with account lockout on multiple failed attempts
 * @param {string} email - Email address
 * @param {string} otp - OTP to verify
 * @returns {Promise} true if valid, false otherwise
 */
export async function verifyOTP(email, otp) {
  try {
    const User = (await import('../models/User.js')).default;
    const emailLower = email.toLowerCase();

    // Check if account is locked
    const user = await User.findByEmail(emailLower);
    if (user?.accountLockoutUntil && new Date(user.accountLockoutUntil) > new Date()) {
      const minutes = Math.ceil((new Date(user.accountLockoutUntil) - new Date()) / 60000);
      console.log(`❌ Account locked for ${email} (${minutes} minutes remaining)`);
      throw new Error(`Account temporarily locked. Try again in ${minutes} minutes.`);
    }

    const otpDoc = await OTP.findOne({ email: emailLower });

    if (!otpDoc) {
      console.log(`❌ No OTP found for ${email}`);
      return false;
    }

    // Check if OTP expired
    if (new Date(otpDoc.expiresAt) < new Date()) {
      console.log(`❌ OTP expired for ${email}`);
      await OTP.deleteOne({ otpId: otpDoc.otpId });
      return false;
    }

    // Check per-OTP attempts
    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      console.log(`❌ Max attempts exceeded for ${email} on this OTP`);
      await OTP.deleteOne({ otpId: otpDoc.otpId });

      // Increment account-level failed attempts
      if (user) {
        const newFailedAttempts = (user.failedOtpAttempts || 0) + 1;

        // Lock account after 10 failed attempts across all OTPs
        if (newFailedAttempts >= 10) {
          await User.update(user.userId, {
            failedOtpAttempts: newFailedAttempts,
            accountLockoutUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          });
          console.log(`🔒 Account locked for ${email} after 10 failed OTP attempts`);
          throw new Error('Account temporarily locked due to too many failed attempts. Try again in 1 hour.');
        }

        await User.update(user.userId, { failedOtpAttempts: newFailedAttempts });
      }
      return false;
    }

    // Verify OTP
    if (otpDoc.otp !== otp) {
      await OTP.update(otpDoc.otpId, { attempts: otpDoc.attempts + 1 });

      // Increment account-level counter
      if (user) {
        const newFailedAttempts = (user.failedOtpAttempts || 0) + 1;
        if (newFailedAttempts >= 10) {
          await User.update(user.userId, {
            failedOtpAttempts: newFailedAttempts,
            accountLockoutUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          });
          console.log(`🔒 Account locked for ${email} after 10 failed OTP attempts`);
          throw new Error('Account temporarily locked due to too many failed attempts. Try again in 1 hour.');
        }
        await User.update(user.userId, { failedOtpAttempts: newFailedAttempts });
      }

      console.log(`❌ Invalid OTP for ${email} (Attempt ${otpDoc.attempts + 1}/${otpDoc.maxAttempts})`);
      return false;
    }

    // OTP verified successfully - reset failed attempts counter
    if (user) {
      await User.update(user.userId, {
        failedOtpAttempts: 0,
        accountLockoutUntil: null
      });
    }

    console.log(`✓ OTP verified for ${email}`);
    await OTP.deleteOne({ otpId: otpDoc.otpId });
    return true;
  } catch (error) {
    console.error('❌ Error verifying OTP:', error.message);
    throw error;
  }
}

export default {
  generateOTP,
  sendOTPViaEmail,
  generateAndSaveOTP,
  verifyOTP
};
