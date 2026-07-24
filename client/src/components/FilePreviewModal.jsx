import React from 'react';
import { Icon } from './ui/Icon';

export const FilePreviewModal = ({ file, onClose }) => {
  if (!file) return null;

  const getMediaType = (url) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    if (url.match(/\.(mp4|webm|mov)$/i)) return 'video';
    if (url.match(/\.pdf$/i)) return 'pdf';
    if (url.match(/\.(doc|docx|txt)$/i)) return 'document';
    if (url.match(/\.(mp3|wav|ogg)$/i)) return 'audio';
    return 'file';
  };

  const mediaType = getMediaType(file.url);

  const downloadFile = () => {
    // Download directly from S3 signed URL (no server overhead)
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.fileName || 'download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container-high rounded-lg max-w-4xl max-h-screen overflow-auto border border-outline-variant" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-outline-variant sticky top-0 bg-surface-container-high">
          <h2 className="text-lg font-semibold text-on-surface truncate">{file.fileName}</h2>
          <div className="flex gap-2">
            <button
              onClick={downloadFile}
              className="px-4 py-2 bg-primary-container hover:bg-primary-container/90 text-on-primary-container rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
            >
              <Icon name="download" className="text-[18px]" /> Download
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-variant hover:bg-outline-variant text-on-surface rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
            >
              <Icon name="close" className="text-[18px]" /> Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {mediaType === 'image' && (
            <img src={file.url} alt={file.fileName} className="w-full rounded-lg" />
          )}

          {mediaType === 'video' && (
            <video src={file.url} controls className="w-full rounded-lg" />
          )}

          {mediaType === 'audio' && (
            <div className="flex flex-col items-center gap-4">
              <audio src={file.url} controls className="w-full" />
              <button
                onClick={downloadFile}
                className="px-6 py-3 bg-primary-container hover:bg-primary-container/90 text-on-primary-container rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Icon name="download" className="text-[18px]" /> Download Audio
              </button>
            </div>
          )}

          {mediaType === 'pdf' && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center text-on-surface-variant">
                <p className="mb-4">PDF Preview - {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}</p>
                {file.url.startsWith('file://') ? (
                  <div className="p-8 bg-background rounded-lg border border-outline-variant">
                    <p className="text-on-surface mb-4">Cannot preview local files in browser</p>
                    <p className="text-sm text-on-surface-variant">Please download the file to view it</p>
                  </div>
                ) : (
                  <iframe
                    src={`${file.url}#toolbar=1`}
                    title={file.fileName}
                    className="w-full h-96 rounded-lg border border-outline-variant"
                    sandbox="allow-same-origin"
                  />
                )}
              </div>
              <button
                onClick={downloadFile}
                className="px-6 py-3 bg-primary-container hover:bg-primary-container/90 text-on-primary-container rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Icon name="download" className="text-[18px]" /> Download PDF
              </button>
            </div>
          )}

          {(mediaType === 'document' || mediaType === 'file') && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="text-center">
                <Icon name="description" className="text-on-surface-variant text-[64px] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-on-surface mb-2">{file.fileName}</h3>
                <p className="text-on-surface-variant mb-4">{file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}</p>
                <p className="text-sm text-on-surface-variant">Click Download to open or save this file</p>
              </div>
              <button
                onClick={downloadFile}
                className="px-8 py-3 bg-primary-container hover:bg-primary-container/90 text-on-primary-container rounded-lg transition-colors font-medium text-lg flex items-center gap-2"
              >
                <Icon name="download" className="text-[20px]" /> Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
