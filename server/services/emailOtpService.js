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
 * Generate a random OTP
 * @param {number} length - Length of OTP (default: 4)
 * @returns {string} Generated OTP
 */
function generateOTP(length = 4) {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1))
    .toString()
    .slice(0, length);
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
        <p style="color: #666; font-size: 14px;">This code expires in <strong>5 minutes</strong>.</p>
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

    const otp = generateOTP(4);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otp,
      expiresAt
    });

    await otpDoc.save();
    console.log(`📧 OTP generated for ${email}`);

    // Send via SES
    await sendOTPViaEmail(email, otp);

    return otpDoc;
  } catch (error) {
    console.error('❌ Error generating OTP:', error.message);
    throw error;
  }
}

/**
 * Verify OTP
 * @param {string} email - Email address
 * @param {string} otp - OTP to verify
 * @returns {Promise} true if valid, false otherwise
 */
export async function verifyOTP(email, otp) {
  try {
    const otpDoc = await OTP.findOne({ email: email.toLowerCase() });

    if (!otpDoc) {
      console.log(`❌ No OTP found for ${email}`);
      return false;
    }

    // Check if OTP expired
    if (otpDoc.expiresAt < new Date()) {
      console.log(`❌ OTP expired for ${email}`);
      await OTP.deleteOne({ _id: otpDoc._id });
      return false;
    }

    // Check attempts
    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      console.log(`❌ Max attempts exceeded for ${email}`);
      await OTP.deleteOne({ _id: otpDoc._id });
      return false;
    }

    // Verify OTP
    if (otpDoc.otp !== otp) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      console.log(`❌ Invalid OTP for ${email} (Attempt ${otpDoc.attempts}/${otpDoc.maxAttempts})`);
      return false;
    }

    // OTP verified successfully
    console.log(`✓ OTP verified for ${email}`);
    await OTP.deleteOne({ _id: otpDoc._id });
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
