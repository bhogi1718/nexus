import React from 'react';
import { X } from 'lucide-react';

export const ChatHeader = ({ conversation, onBack, onClose, user }) => {
  if (!conversation) return null;

  const otherUser = conversation.type === 'group'
    ? null
    : conversation.participants.find(p => String(p._id) !== String(user?.id));

  const isOnline = otherUser?.isOnline;
  const status = conversation.type === 'group'
    ? `${conversation.participants.length} members`
    : (isOnline ? 'Online' : 'Offline');

  return (
    <div className="p-3 md:p-4 border-b border-border bg-sidebar flex-shrink-0">
      <div className="flex items-center justify-between gap-2 md:gap-3">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back to conversations"
            className="md:hidden p-2 rounded-lg text-text-secondary hover:bg-card flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-xl font-bold text-text-primary truncate">
            {conversation.name || (otherUser ? otherUser.name : 'Unknown')}
          </h2>
          <p className="text-xs md:text-sm text-text-muted">{status}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close conversation"
            title="Close conversation"
            className="hidden md:flex p-2 rounded-lg text-text-secondary hover:bg-card flex-shrink-0 min-w-[40px] min-h-[40px] items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
