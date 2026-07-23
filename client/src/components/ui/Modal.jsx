import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export const Modal = ({ isOpen, onClose, title, children, footer }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md bg-card text-text-primary rounded-t-2xl md:rounded-2xl shadow-2xl outline-none animate-sheet-slide-up md:animate-dialog-scale-in max-h-[85vh] flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose} size="sm">
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        <div className="p-4 overflow-y-auto">{children}</div>

        {footer && (
          <div className="p-4 border-t border-border flex-shrink-0 flex gap-2 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
