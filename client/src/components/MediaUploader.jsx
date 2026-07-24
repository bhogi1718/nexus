import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import api from '../services/api';
import { Icon } from './ui/Icon';

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
      const response = await api.post(
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
        className="p-2 hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="Attach file"
        aria-label="Attach file"
      >
        <Icon name="attach_file" className="text-on-surface-variant text-[20px]" />
      </button>

      {uploading && (
        <div className="absolute bottom-full mb-2 left-0 bg-surface-container-high p-3 rounded-lg shadow-md border border-outline-variant">
          <p className="text-sm font-medium mb-2 text-on-surface">Uploading... {uploadProgress}%</p>
          <div className="w-48 h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
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
