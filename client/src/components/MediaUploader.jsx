import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import api from '../services/api';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { useToast } from './ui/Toast';

const MAX_BYTES = 50 * 1024 * 1024;

const MediaUploaderComponent = forwardRef(({ onUploadSuccess, conversationId }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);
  const toast = useToast();

  const uploadFile = async (file) => {
    if (!conversationId) {
      toast.error('Open a conversation before attaching a file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Files must be smaller than 50 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);

    setUploading(true);
    setUploadProgress(0);
    setFileName(file.name);

    try {
      const response = await api.post('/chat/upload', formData, {
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      let messageType = 'document';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'voice';

      onUploadSuccess({
        url: response.data.url,
        fileName: response.data.fileName,
        fileSize: response.data.fileSize,
        type: messageType,
        s3Key: response.data.s3Key,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  useImperativeHandle(ref, () => ({ uploadFile }));

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
      <IconButton label="Attach a file" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        <Icon
          name={uploading ? 'progress_activity' : 'add_circle'}
          className={`text-[24px] ${uploading ? 'animate-spin' : ''}`}
        />
      </IconButton>

      {uploading && (
        <div
          role="status"
          className="absolute bottom-full mb-sm left-0 w-64 bg-surface p-sm rounded-xl shadow-lg border border-border animate-fade-in-up"
        >
          <div className="flex items-center gap-sm mb-sm">
            <span className="w-8 h-8 rounded-lg bg-surface-accent flex items-center justify-center flex-shrink-0">
              <Icon name="upload" className="text-[18px] text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-medium text-content truncate">{fileName}</span>
              <span className="block text-caption text-content-muted tabular-nums">Uploading… {uploadProgress}%</span>
            </span>
          </div>
          <div className="h-1.5 bg-surface-sunken rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-base ease-enter"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

MediaUploaderComponent.displayName = 'MediaUploader';

export const MediaUploader = MediaUploaderComponent;
