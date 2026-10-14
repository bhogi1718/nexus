import React from 'react';
import { Avatar } from './ui/Avatar';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { presenceLabel } from '../utils/time';

export const ChatHeader = ({ conversation, onBack, onClose, user, isTyping = false, displayName, onOpenInfo }) => {
  if (!conversation) return null;

  const isGroup = conversation.type === 'group';
  const otherUser = isGroup
    ? null
    : conversation.participants.find(p => String(p._id) !== String(user?.id));

  const name = conversation.name || (otherUser ? (displayName ? displayName(otherUser) : otherUser.name) : 'Unknown');
  const isOnline = Boolean(otherUser?.isOnline);

  let status;
  if (isGroup) status = `${conversation.participants.length} members`;
  else if (isTyping) status = 'typing…';
  else status = presenceLabel(otherUser);

  const identity = (
    <>
      <Avatar name={otherUser?.name || name} src={otherUser?.avatar} size="sm" showStatus={!isGroup} isOnline={isOnline} />
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-title-md text-content truncate">{name}</span>
        <span className={`block text-caption truncate transition-colors duration-fast min-h-[1rem]
          ${isTyping ? 'text-primary font-semibold' : isOnline ? 'text-success' : 'text-content-muted'}`}>
          {status || (onOpenInfo ? 'tap for contact info' : '')}
        </span>
      </span>
    </>
  );

  return (
    <header className="px-sm md:px-md h-16 border-b border-border bg-surface/90 backdrop-blur-md flex-shrink-0 flex items-center gap-sm">
      {onBack && (
        <IconButton label="Back to conversations" onClick={onBack} className="md:hidden -ml-1">
          <Icon name="arrow_back" className="text-[22px]" />
        </IconButton>
      )}

      {onOpenInfo && otherUser ? (
        <button
          type="button"
          onClick={() => onOpenInfo(otherUser._id)}
          aria-label={`View ${name}'s profile`}
          className="flex-1 min-w-0 flex items-center gap-sm rounded-lg -my-1 py-1 -ml-1 pl-1 transition-colors duration-fast hover:bg-surface-sunken"
        >
          {identity}
        </button>
      ) : (
        <div className="flex-1 min-w-0 flex items-center gap-sm">{identity}</div>
      )}

      <span
        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-sunken text-caption text-content-secondary"
        title="Messages in this chat are end-to-end encrypted"
      >
        <Icon name="lock" className="text-[14px]" />
        Encrypted
      </span>

      {onClose && (
        <IconButton label="Close conversation" onClick={onClose} className="hidden md:flex">
          <Icon name="close" className="text-[22px]" />
        </IconButton>
      )}
    </header>
  );
};
