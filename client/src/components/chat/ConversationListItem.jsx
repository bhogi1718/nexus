import React from 'react';
import { Icon } from '../ui/Icon';
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
        className={`w-full ${padding} ${onDelete ? 'pr-10' : ''} text-left border-b border-outline-variant transition-colors min-h-[70px] flex flex-col justify-center ${
          isSelected
            ? 'bg-surface-variant/30 border-l-4 border-l-primary'
            : hasUnread
              ? 'bg-surface-variant/20 border-l-4 border-l-primary hover:bg-surface-variant/40'
              : 'hover:bg-surface-container-high'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate flex items-center gap-1.5 flex-1 font-headline-md text-headline-md ${hasUnread ? 'font-bold' : ''} text-on-surface`}>
            {name}
            {isUnknown && (
              <span className="px-2 py-0.5 bg-tertiary-container/20 text-tertiary text-xs font-semibold rounded-full flex-shrink-0">
                Unknown
              </span>
            )}
          </p>
          {hasUnread && (
            <span className="flex-shrink-0 min-w-[24px] h-6 px-1.5 bg-primary-container text-on-primary-container text-xs font-bold rounded-full flex items-center justify-center">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
        <p className={`font-body-sm text-body-sm truncate mt-1 ${hasUnread ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
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
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-40 md:group-hover:opacity-100"
        >
          <Icon name="delete" className="text-[18px]" />
        </IconButton>
      )}
    </div>
  );
};
