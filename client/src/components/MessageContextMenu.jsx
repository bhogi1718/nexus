import React, { useEffect, useRef } from 'react';

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
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl shadow-2xl z-50 animate-sheet-slide-up"
    >
      <div className="flex justify-between items-center p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Message Options</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded-lg text-text-muted hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="divide-y divide-border">
        {message.content && (
          <button
            onClick={handleCopy}
            className="w-full px-4 py-3 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-text-primary font-medium">Copy</span>
          </button>
        )}

        {isCurrentUser && (
          <button
            onClick={onDelete}
            className="w-full px-4 py-3 text-left text-sm hover:bg-red-500/10 transition-colors flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-text-primary font-medium">Delete</span>
          </button>
        )}
      </div>

      <div className="p-2">
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 text-center text-sm font-medium text-text-secondary hover:bg-background rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
