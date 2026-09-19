import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  configured = true;
}

// Cloudinary buckets uploads into image / video / raw; documents and audio are
// "raw" or "video" respectively, and picking the type explicitly avoids
// misdetection on ambiguous MIME types.
export function resourceTypeFor(mimeType) {
  if (!mimeType) return 'raw';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}

function safeBaseName(fileName) {
  return path.basename(fileName, path.extname(fileName))
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60) || 'file';
}

export async function uploadFile(fileBuffer, fileName, conversationId, mimeType) {
  ensureConfigured();

  const resourceType = resourceTypeFor(mimeType);
  const ext = path.extname(fileName).toLowerCase();
  // Raw files keep their extension in the public_id so the delivered URL has one.
  const publicId = `${uuidv4()}-${safeBaseName(fileName)}${resourceType === 'raw' ? ext : ''}`;

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `nexus/${conversationId}`,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false
      },
      (error, uploaded) => (error ? reject(error) : resolve(uploaded))
    );
    stream.end(fileBuffer);
  });

  return {
    url: result.secure_url,
    key: result.public_id,
    resourceType: result.resource_type,
    size: result.bytes
  };
}

export function getFileUrl(key, resourceType = 'raw') {
  ensureConfigured();
  return cloudinary.url(key, { resource_type: resourceType, secure: true });
}

export async function downloadFile(key, resourceType = 'raw') {
  const url = getFileUrl(key, resourceType);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Storage returned ${response.status} for ${key}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteFile(key, resourceType = 'raw') {
  ensureConfigured();
  const result = await cloudinary.uploader.destroy(key, { resource_type: resourceType, invalidate: true });
  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new Error(`Cloudinary destroy failed: ${result.result}`);
  }
}

export default { uploadFile, getFileUrl, downloadFile, deleteFile, resourceTypeFor };
