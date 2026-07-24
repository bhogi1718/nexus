import React, { useEffect, useRef } from 'react';
import { Icon } from './ui/Icon';

export const MessageContextMenu = ({ message, isCurrentUser, onClose, onCopy, onDelete }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bottom-0 left-0 right-0 bg-surface-container-high border-t border-outline-variant rounded-t-xl shadow-2xl z-50 animate-sheet-slide-up"
    >
      <div className="flex justify-between items-center p-4 border-b border-outline-variant">
        <h3 className="text-sm font-semibold text-on-surface">Message Options</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded-lg text-on-surface-variant hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>

      <div className="divide-y divide-outline-variant">
        {message.content && (
          <button
            onClick={handleCopy}
            className="w-full px-4 py-3 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
          >
            <Icon name="content_copy" className="text-primary text-[20px] flex-shrink-0" />
            <span className="text-on-surface font-medium">Copy</span>
          </button>
        )}

        {isCurrentUser && (
          <button
            onClick={onDelete}
            className="w-full px-4 py-3 text-left text-sm hover:bg-error/10 transition-colors flex items-center gap-3"
          >
            <Icon name="delete" className="text-error text-[20px] flex-shrink-0" />
            <span className="text-on-surface font-medium">Delete</span>
          </button>
        )}
      </div>

      <div className="p-2">
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 text-center text-sm font-medium text-on-surface-variant hover:bg-background rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
