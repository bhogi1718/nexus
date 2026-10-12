import React, { useState } from 'react';
import { Icon } from './ui/Icon';
import { useToast } from './ui/Toast';
import { FilePreviewModal } from './FilePreviewModal';
import { attachmentKind, downloadAttachment, formatFileSize } from '../utils/download';

export const MediaMessage = ({ message, isCurrentUser }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  if (!message.fileUrl) return null;

  const kind = attachmentKind(message);
  const size = formatFileSize(message.fileSize);
  const file = { url: message.fileUrl, fileName: message.fileName, size: message.fileSize, messageId: message._id, kind };

  const download = async (e) => {
    e?.stopPropagation();
    setDownloading(true);
    try {
      await downloadAttachment(file);
    } catch {
      toast.error('Could not download this file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const tint = isCurrentUser ? 'bg-black/10 hover:bg-black/15' : 'bg-surface-sunken hover:bg-surface-accent/60';

  return (
    <div className="-mx-1.5 mt-0.5 mb-1">
      {kind === 'image' && (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          aria-label={`Open image ${message.fileName || ''}`}
          className="block overflow-hidden rounded-[14px]"
        >
          {/* Fixed box so the chat doesn't jump when the image finishes loading. */}
          <img
            src={message.fileUrl}
            alt={message.fileName || 'Image'}
            loading="lazy"
            className="w-64 max-w-full aspect-[4/3] object-cover bg-surface-sunken transition-transform duration-base hover:scale-[1.02]"
          />
        </button>
      )}

      {kind === 'video' && (
        <video
          src={message.fileUrl}
          controls
          preload="metadata"
          className="w-64 max-w-full aspect-video rounded-[14px] bg-black"
        />
      )}

      {kind === 'audio' && (
        <div className="flex items-center gap-1.5 w-64 max-w-full">
          <audio src={message.fileUrl} controls preload="metadata" className="flex-1 min-w-0 h-10" />
          <DownloadButton onClick={download} loading={downloading} isCurrentUser={isCurrentUser} />
        </div>
      )}

      {(kind === 'pdf' || kind === 'file') && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowPreview(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowPreview(true); } }}
          className={`flex items-center gap-sm w-64 max-w-full p-2.5 rounded-xl cursor-pointer transition-colors duration-fast ${tint}`}
        >
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
            ${isCurrentUser ? 'bg-white/15' : 'bg-surface'}`}>
            <Icon name={kind === 'pdf' ? 'picture_as_pdf' : 'description'} className="text-[22px]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-body-sm font-semibold truncate">{message.fileName || 'File'}</span>
            <span className={`block text-caption ${isCurrentUser ? 'text-content-on-primary/70' : 'text-content-muted'}`}>
              {[kind === 'pdf' ? 'PDF' : 'Document', size].filter(Boolean).join(' · ')}
            </span>
          </span>
          <DownloadButton onClick={download} loading={downloading} isCurrentUser={isCurrentUser} />
        </div>
      )}

      {showPreview && (
        <FilePreviewModal file={file} onClose={() => setShowPreview(false)} onDownload={download} downloading={downloading} />
      )}
    </div>
  );
};

const DownloadButton = ({ onClick, loading, isCurrentUser }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    aria-label="Download file"
    title="Download"
    className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors duration-fast disabled:opacity-60
      ${isCurrentUser ? 'hover:bg-white/15' : 'hover:bg-surface'}`}
  >
    <Icon name={loading ? 'progress_activity' : 'download'} className={`text-[20px] ${loading ? 'animate-spin' : ''}`} />
  </button>
);
