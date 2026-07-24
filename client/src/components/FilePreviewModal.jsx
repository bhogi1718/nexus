import React from 'react';

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
      <div className="bg-card rounded-lg max-w-4xl max-h-screen overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-text-primary truncate">{file.fileName}</h2>
          <div className="flex gap-2">
            <button
              onClick={downloadFile}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors text-sm font-medium"
            >
              ⬇ Download
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-background hover:bg-border text-text-primary rounded-lg transition-colors text-sm font-medium"
            >
              ✕ Close
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
                className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors font-medium"
              >
                ⬇ Download Audio
              </button>
            </div>
          )}

          {mediaType === 'pdf' && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center text-text-muted">
                <p className="mb-4">PDF Preview - {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}</p>
                {file.url.startsWith('file://') ? (
                  <div className="p-8 bg-background rounded-lg border border-border">
                    <p className="text-text-secondary mb-4">Cannot preview local files in browser</p>
                    <p className="text-sm text-text-muted">Please download the file to view it</p>
                  </div>
                ) : (
                  <iframe
                    src={`${file.url}#toolbar=1`}
                    title={file.fileName}
                    className="w-full h-96 rounded-lg border border-border"
                    sandbox="allow-same-origin"
                  />
                )}
              </div>
              <button
                onClick={downloadFile}
                className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors font-medium"
              >
                ⬇ Download PDF
              </button>
            </div>
          )}

          {(mediaType === 'document' || mediaType === 'file') && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="text-center">
                <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{file.fileName}</h3>
                <p className="text-text-muted mb-4">{file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}</p>
                <p className="text-sm text-text-muted">Click Download to open or save this file</p>
              </div>
              <button
                onClick={downloadFile}
                className="px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors font-medium text-lg"
              >
                ⬇ Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
