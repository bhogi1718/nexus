import React, { useEffect, useRef } from 'react';
import { Icon } from './ui/Icon';
import { formatFileSize } from '../utils/download';

/** Full-screen viewer for an attachment. */
export const FilePreviewModal = ({ file, onClose, onDownload, downloading }) => {
  const closeRef = useRef(null);
  // Callers pass a fresh onClose/file each render; run setup once per opening
  // and read the latest onClose through a ref, or focus would be stolen back
  // to the close button on every re-render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isOpen = Boolean(file);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      previousFocus?.focus?.();
    };
  }, [isOpen]);

  if (!file) return null;
  const size = formatFileSize(file.size);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={file.fileName || 'Attachment'}
      className="fixed inset-0 z-[55] flex flex-col bg-black/90 animate-fade-in"
      onClick={onClose}
    >
      <header
        className="flex items-center gap-sm px-md py-sm text-white flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex-1 min-w-0">
          <span className="block text-title-sm truncate">{file.fileName || 'Attachment'}</span>
          {size && <span className="block text-caption text-white/60">{size}</span>}
        </span>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-body-sm font-semibold transition-colors disabled:opacity-60"
        >
          <Icon name={downloading ? 'progress_activity' : 'download'} className={`text-[18px] ${downloading ? 'animate-spin' : ''}`} />
          Download
        </button>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Icon name="close" className="text-[24px]" />
        </button>
      </header>

      <div className="flex-1 min-h-0 flex items-center justify-center p-md" onClick={(e) => e.stopPropagation()}>
        {file.kind === 'image' && (
          <img src={file.url} alt={file.fileName || 'Image'} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        )}
        {file.kind === 'video' && (
          <video src={file.url} controls autoPlay className="max-w-full max-h-full rounded-lg bg-black" />
        )}
        {file.kind === 'pdf' && (
          // Not sandboxed: a sandboxed frame blocks the browser's PDF viewer and renders blank.
          <iframe src={file.url} title={file.fileName || 'PDF'} className="w-full max-w-4xl h-full rounded-lg bg-white" />
        )}
        {(file.kind === 'file' || file.kind === 'audio') && (
          <div className="text-center text-white">
            <Icon name="description" className="text-[64px] text-white/70" />
            <p className="mt-sm text-title-md">{file.fileName}</p>
            <p className="mt-xs text-body-sm text-white/60">No preview available — download it to open.</p>
          </div>
        )}
      </div>
    </div>
  );
};
