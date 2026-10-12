import React from 'react';
import { Avatar } from './ui/Avatar';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';

export const ChatHeader = ({ conversation, onBack, onClose, user, isTyping = false }) => {
  if (!conversation) return null;

  const isGroup = conversation.type === 'group';
  const otherUser = isGroup
    ? null
    : conversation.participants.find(p => String(p._id) !== String(user?.id));

  const name = conversation.name || otherUser?.name || 'Unknown';
  const isOnline = Boolean(otherUser?.isOnline);

  let status;
  if (isGroup) status = `${conversation.participants.length} members`;
  else if (isTyping) status = 'typing…';
  else status = isOnline ? 'Online' : 'Offline';

  return (
    <header className="px-sm md:px-md h-16 border-b border-border bg-surface/90 backdrop-blur-md flex-shrink-0 flex items-center gap-sm">
      {onBack && (
        <IconButton label="Back to conversations" onClick={onBack} className="md:hidden -ml-1">
          <Icon name="arrow_back" className="text-[22px]" />
        </IconButton>
      )}

      <Avatar name={name} src={otherUser?.avatar} size="sm" showStatus={!isGroup} isOnline={isOnline} />

      <div className="flex-1 min-w-0">
        <h2 className="text-title-md font-sans text-content truncate">{name}</h2>
        <p className={`text-caption truncate transition-colors duration-fast
          ${isTyping ? 'text-primary font-semibold' : isOnline ? 'text-success' : 'text-content-muted'}`}>
          {status}
        </p>
      </div>

      <span
        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-sunken text-caption text-content-secondary"
        title="Messages in this conversation are encrypted on your device"
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
