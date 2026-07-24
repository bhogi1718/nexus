import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';
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
        className="w-full md:max-w-md bg-surface-container-high text-on-surface rounded-t-xl md:rounded-xl shadow-2xl outline-none animate-sheet-slide-up md:animate-dialog-scale-in max-h-[85vh] flex flex-col border border-outline-variant"
      >
        <div className="flex justify-between items-center p-4 border-b border-outline-variant flex-shrink-0">
          <h2 className="font-headline-md text-headline-md">{title}</h2>
          <IconButton label="Close" onClick={onClose} size="sm">
            <Icon name="close" className="text-[20px]" />
          </IconButton>
        </div>

        <div className="p-4 overflow-y-auto">{children}</div>

        {footer && (
          <div className="p-4 border-t border-outline-variant flex-shrink-0 flex gap-2 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
