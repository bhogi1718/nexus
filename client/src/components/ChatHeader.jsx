import React from 'react';
import { Icon } from './ui/Icon';

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
    <div className="p-3 md:p-4 border-b border-outline-variant bg-surface flex-shrink-0">
      <div className="flex items-center justify-between gap-2 md:gap-3">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back to conversations"
            className="md:hidden p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-xl font-bold text-on-surface truncate">
            {conversation.name || (otherUser ? otherUser.name : 'Unknown')}
          </h2>
          <p className="text-xs md:text-sm text-on-surface-variant flex items-center gap-1">
            {conversation.type !== 'group' && (
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary' : 'border border-outline'}`} />
            )}
            {status}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close conversation"
            title="Close conversation"
            className="hidden md:flex p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high flex-shrink-0 min-w-[40px] min-h-[40px] items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        )}
      </div>
    </div>
  );
};
