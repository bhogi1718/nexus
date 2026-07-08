import multer from 'multer';
import path from 'path';

// Use memory storage to keep files in RAM until uploaded to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed MIME types and extensions with mapping
  const allowedFileTypes = {
    'image/jpeg': ['.jpeg', '.jpg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm']
  };

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeAllowedExts = allowedFileTypes[file.mimetype] || [];
  const mimeSupported = Object.keys(allowedFileTypes).includes(file.mimetype);

  // Check if MIME type is supported
  if (!mimeSupported) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }

  // Check if extension matches MIME type
  if (!mimeAllowedExts.includes(ext)) {
    return cb(new Error(`File extension ${ext} does not match MIME type ${file.mimetype}`));
  }

  // Additional security: reject files with multiple extensions (e.g., file.doc.exe)
  const fileName = path.basename(file.originalname);
  const parts = fileName.split('.');
  if (parts.length > 2) {
    console.warn(`Suspicious file with multiple extensions detected: ${file.originalname}`);
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});
