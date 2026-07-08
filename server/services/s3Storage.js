import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Lazy-load S3 client after env vars are available
let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    const config = { region: process.env.AWS_REGION || 'us-east-1' };
    // Only pass explicit credentials when set (local dev). Without them the
    // SDK uses the default provider chain — e.g. the EC2/EB instance role.
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    }
    s3Client = new S3Client(config);
  }
  return s3Client;
}

function getBucketName() {
  return process.env.AWS_S3_BUCKET || 'nexus-messenger';
}

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File content
 * @param {string} fileName - Original filename
 * @param {string} conversationId - Conversation ID for folder structure
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise} {url, key, size}
 */
export const uploadToS3 = async (fileBuffer, fileName, conversationId, mimeType = 'application/octet-stream') => {
  try {
    // Generate unique key: conversations/{conversationId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const key = `conversations/${conversationId}/${timestamp}-${fileName}`;

    console.log(`📤 Uploading to S3: ${key} | Size: ${fileBuffer.length} bytes | MIME: ${mimeType}`);

    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ContentLength: fileBuffer.length
    });

    const response = await getS3Client().send(command);
    console.log(`✓ Upload successful to S3 | File: ${key} | Size: ${fileBuffer.length} bytes`);

    // Generate a signed URL (valid for 7 days)
    const signedUrl = await getSignedUrl(getS3Client(), new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key
    }), { expiresIn: 7 * 24 * 60 * 60 });

    return {
      url: signedUrl,
      key: key,
      size: fileBuffer.length,
      bucket: getBucketName()
    };
  } catch (error) {
    console.error('❌ S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
};

/**
 * Get signed URL for file
 * @param {string} key - S3 object key
 * @returns {Promise} Signed URL
 */
export const getSignedUrlForFile = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key
    });

    const signedUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 60 * 60 }); // 1 hour
    return signedUrl;
  } catch (error) {
    console.error('❌ Failed to generate signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Download file from S3
 * @param {string} key - S3 object key
 * @returns {Promise} File buffer
 */
export const downloadFromS3 = async (key) => {
  try {
    console.log(`📥 Downloading from S3: ${key}`);

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key
    });

    const response = await getS3Client().send(command);
    const chunks = [];

    // Convert readable stream to buffer
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    console.log(`✓ Downloaded from S3: ${key} | Size: ${buffer.length} bytes | Chunks: ${chunks.length}`);

    return buffer;
  } catch (error) {
    console.error('❌ S3 download error:', error);
    throw new Error(`Failed to download from S3: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {string} key - S3 object key
 */
export const deleteFromS3 = async (key) => {
  try {
    console.log(`🗑️ Deleting from S3: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key
    });

    await getS3Client().send(command);
    console.log(`✓ Deleted from S3: ${key}`);
  } catch (error) {
    console.error('❌ S3 delete error:', error);
    throw new Error(`Failed to delete from S3: ${error.message}`);
  }
};

export { getS3Client, getBucketName };

export default {
  uploadToS3,
  getSignedUrlForFile,
  downloadFromS3,
  deleteFromS3,
  getS3Client,
  getBucketName
};
