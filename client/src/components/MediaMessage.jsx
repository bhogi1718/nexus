import React, { useState } from 'react';
import { FilePreviewModal } from './FilePreviewModal';

export const MediaMessage = ({ message, isCurrentUser }) => {
  const [showPreview, setShowPreview] = useState(false);

  if (!message.fileUrl) {
    return null;
  }

  const getMediaType = (url) => {
    // Extract filename before query parameters
    const urlPath = url.split('?')[0].split('#')[0];
    const filename = urlPath.toLowerCase();

    if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    if (filename.match(/\.(mp4|webm|mov)$/i)) return 'video';
    if (filename.match(/\.pdf$/i)) return 'pdf';
    if (filename.match(/\.(doc|docx|txt)$/i)) return 'document';
    if (filename.match(/\.(mp3|wav|ogg)$/i)) return 'audio';
    return 'file';
  };

  const mediaType = getMediaType(message.fileUrl);

  const downloadFile = () => {
    // Download directly from S3 signed URL
    const a = document.createElement('a');
    a.href = message.fileUrl;
    a.download = message.fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderMedia = () => {
    switch (mediaType) {
      case 'image':
        return (
          <div className="cursor-pointer" onClick={() => setShowPreview(true)}>
            <img
              src={message.fileUrl}
              alt={message.fileName}
              className="max-w-xs rounded-lg hover:opacity-90 transition-opacity"
            />
          </div>
        );
      case 'video':
        return (
          <div className="cursor-pointer" onClick={() => setShowPreview(true)}>
            <video
              src={message.fileUrl}
              controls
              className="max-w-xs rounded-lg hover:opacity-90 transition-opacity"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <audio
              src={message.fileUrl}
              controls
              className="flex-1"
            />
            <button
              onClick={downloadFile}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="Download audio"
              aria-label="Download audio"
            >
              ⬇
            </button>
          </div>
        );
      case 'pdf':
      case 'document':
      case 'file':
        return (
          <div
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{message.fileName}</p>
              {message.fileSize && (
                <p className="text-xs text-gray-500">
                  {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadFile();
              }}
              className="p-2 hover:bg-gray-300 rounded transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="Download file"
              aria-label="Download file"
            >
              ⬇
            </button>
          </div>
        );
      default:
        return <p className="text-sm text-gray-500">Unsupported file type</p>;
    }
  };

  return (
    <div className="mt-2">
      {renderMedia()}
      {message.content && (
        <p className="text-sm mt-2 break-words">{message.content}</p>
      )}
      <FilePreviewModal
        file={showPreview ? {
          url: message.fileUrl,
          fileName: message.fileName,
          size: message.fileSize,
          messageId: message._id
        } : null}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
};
