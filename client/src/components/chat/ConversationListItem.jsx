import React from 'react';
import { Trash2 } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

export const ConversationListItem = ({
  conversation,
  isSelected,
  name,
  isUnknown,
  onClick,
  onDelete,
  padding = 'p-4',
}) => {
  const hasUnread = (conversation.unreadCount || 0) > 0;

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={`w-full ${padding} ${onDelete ? 'pr-10' : ''} text-left border-b border-border transition-colors min-h-[70px] flex flex-col justify-center ${
          isSelected
            ? 'bg-accent/10'
            : hasUnread
              ? 'bg-accent/5 border-l-4 border-l-accent hover:bg-accent/10'
              : 'hover:bg-card'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate flex items-center gap-1.5 flex-1 ${hasUnread ? 'font-bold text-text-primary' : 'font-semibold text-text-primary'} text-sm`}>
            {name}
            {isUnknown && (
              <span className="px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full flex-shrink-0">
                Unknown
              </span>
            )}
          </p>
          {hasUnread && (
            <span className="flex-shrink-0 min-w-[24px] h-6 px-1.5 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
        <p className={`text-xs truncate mt-1 ${hasUnread ? 'font-semibold text-text-secondary' : 'text-text-muted'}`}>
          {conversation.lastMessage?.undecryptable
            ? '🔒 Encrypted message'
            : conversation.lastMessage?.content || 'No messages yet'}
        </p>
      </button>
      {onDelete && (
        <IconButton
          label="Delete conversation"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          variant="danger"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </IconButton>
      )}
    </div>
  );
};
