import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { apiClient } from '../services';

const MediaUploaderComponent = forwardRef(({ onUploadSuccess, conversationId }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const uploadFile = async (file) => {
    if (!conversationId) {
      alert('No active conversation. Please select a conversation first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await apiClient.post(
        '/chat/upload',
        formData,
        {
          onUploadProgress: (progressEvent) => {
            try {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              setUploadProgress(progress);
            } catch (err) {
              console.error('Progress tracking error:', err);
            }
          }
        }
      );

      // Determine message type based on file MIME type
      let messageType = 'document';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'voice';

      onUploadSuccess({
        url: response.data.url,
        fileName: response.data.fileName,
        fileSize: response.data.fileSize,
        type: messageType,
        s3Key: response.data.s3Key
      });

      setUploadProgress(0);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    await uploadFile(file);
  };

  useImperativeHandle(ref, () => ({
    uploadFile: (file) => uploadFile(file)
  }));

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt,audio/*"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Attach file"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7.172a4 4 0 11-5.656 0m3.828-1.414a6 6 0 11-8.485 0m2.828-2.828a8 8 0 1111.314 0" />
        </svg>
      </button>

      {uploading && (
        <div className="absolute bottom-full mb-2 left-0 bg-white p-3 rounded-lg shadow-md border border-gray-200">
          <p className="text-sm font-medium mb-2">Uploading... {uploadProgress}%</p>
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
});

MediaUploaderComponent.displayName = 'MediaUploader';

export const MediaUploader = MediaUploaderComponent;
