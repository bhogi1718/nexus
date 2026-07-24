import React from 'react';

export const ContactListItem = ({ contact, onMessage, onRemove }) => (
  <div className="flex items-center gap-3 p-4 border-b border-border hover:bg-card">
    <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-hover rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
      {contact.name?.charAt(0).toUpperCase() || '?'}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-text-primary text-sm truncate">{contact.nickname || contact.name}</p>
      <p className="text-xs text-text-muted truncate">{contact.email}</p>
    </div>
    <button onClick={onMessage} aria-label="Message contact" className="p-2 rounded-lg text-accent hover:bg-accent/10 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </button>
    <button onClick={onRemove} aria-label="Remove contact" className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
);
