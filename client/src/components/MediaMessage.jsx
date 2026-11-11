import React, { useState } from 'react';
import { Icon } from './ui/Icon';
import { useToast } from './ui/Toast';
import { FilePreviewModal } from './FilePreviewModal';
import { attachmentKind, downloadAttachment, formatFileSize } from '../utils/download';
import { saveAs } from '../utils/attachments';
import { useAttachment } from '../hooks/useAttachment';

export const MediaMessage = ({ message, isCurrentUser }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const kind = attachmentKind(message);
  // Images open on their own; larger media waits for a tap so a chat full of
  // videos doesn't download them all.
  const { url, status, sealed, load } = useAttachment(message, { auto: kind === 'image' });

  if (!message.fileUrl) return null;

  const size = formatFileSize(message.fileSize);
  const file = {
    url,
    fileName: message.fileName,
    size: message.fileSize,
    messageId: message._id,
    kind,
    loading: status === 'loading',
    failed: status === 'error',
  };

  const download = async (e) => {
    e?.stopPropagation();
    setDownloading(true);
    try {
      if (sealed) {
        const href = await load();
        if (!href) throw new Error('Attachment could not be decrypted');
        saveAs(href, message.fileName);
      } else {
        await downloadAttachment(file);
      }
    } catch {
      toast.error('Could not download this file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const openPreview = () => {
    setShowPreview(true);
    if (sealed) load();
  };

  const tint = isCurrentUser ? 'bg-black/10 hover:bg-black/15' : 'bg-surface-sunken hover:bg-surface-accent/60';

  return (
    <div className="-mx-1.5 mt-0.5 mb-1">
      {kind === 'image' && (url ? (
        <button
          type="button"
          onClick={openPreview}
          aria-label={`Open image ${message.fileName || ''}`}
          className="block overflow-hidden rounded-[14px]"
        >
          {/* Fixed box so the chat doesn't jump when the image finishes loading. */}
          <img
            src={url}
            alt={message.fileName || 'Image'}
            loading="lazy"
            className="w-64 max-w-full aspect-[4/3] object-cover bg-surface-sunken transition-transform duration-base hover:scale-[1.02]"
          />
        </button>
      ) : (
        <SealedPlaceholder
          className="aspect-[4/3]"
          status={status}
          icon="image"
          label="Image"
          size={size}
          onLoad={load}
          tint={tint}
        />
      ))}

      {kind === 'video' && (url ? (
        <video
          src={url}
          controls
          preload="metadata"
          className="w-64 max-w-full aspect-video rounded-[14px] bg-black"
        />
      ) : (
        <SealedPlaceholder
          className="aspect-video"
          status={status}
          icon="play_circle"
          label="Video"
          size={size}
          onLoad={load}
          tint={tint}
        />
      ))}

      {kind === 'audio' && (url ? (
        <div className="flex items-center gap-1.5 w-64 max-w-full">
          <audio src={url} controls preload="metadata" className="flex-1 min-w-0 h-10" />
          <DownloadButton onClick={download} loading={downloading} isCurrentUser={isCurrentUser} />
        </div>
      ) : (
        <SealedPlaceholder
          className="h-14"
          status={status}
          icon="graphic_eq"
          label="Audio"
          size={size}
          onLoad={load}
          tint={tint}
        />
      ))}

      {(kind === 'pdf' || kind === 'file') && (
        <div
          role="button"
          tabIndex={0}
          onClick={openPreview}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPreview(); } }}
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

// Stands in for encrypted media until it has been downloaded and decrypted here.
const SealedPlaceholder = ({ className, status, icon, label, size, onLoad, tint }) => {
  const loading = status === 'loading';
  const failed = status === 'error';
  return (
    <button
      type="button"
      onClick={onLoad}
      disabled={loading}
      className={`w-64 max-w-full rounded-[14px] flex flex-col items-center justify-center gap-1 transition-colors duration-fast ${tint} ${className}`}
    >
      <Icon
        name={loading ? 'progress_activity' : failed ? 'error' : icon}
        className={`text-[28px] ${loading ? 'animate-spin' : ''}`}
      />
      <span className="text-caption font-semibold">
        {loading ? 'Decrypting…' : failed ? 'Couldn’t open — tap to retry' : [label, size].filter(Boolean).join(' · ')}
      </span>
    </button>
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
