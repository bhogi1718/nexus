import React, { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';

export const ContactListItem = ({ contact, onMessage, onRemove, onOpenInfo }) => {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const displayName = contact.nickname || contact.name;
  const subtitle = contact.status || contact.email;

  return (
    <>
      <div className="flex items-center gap-sm px-md py-3 min-h-[68px] transition-colors duration-fast hover:bg-surface-sunken">
        <button
          type="button"
          onClick={() => onOpenInfo?.(contact._id)}
          disabled={!onOpenInfo}
          aria-label={`View ${displayName}'s profile`}
          className="flex-1 min-w-0 flex items-center gap-sm text-left disabled:cursor-default"
        >
          <Avatar name={contact.name} src={contact.avatar} size="md" showStatus isOnline={contact.isOnline} />
          <span className="flex-1 min-w-0">
            <span className="block text-title-sm text-content truncate">{displayName}</span>
            <span className="block text-body-sm text-content-muted truncate">{subtitle}</span>
          </span>
        </button>

        <IconButton label={`Message ${displayName}`} variant="accent" onClick={onMessage}>
          <Icon name="chat_bubble" className="text-[20px]" />
        </IconButton>
        <IconButton label={`Remove ${displayName}`} variant="danger" onClick={() => setConfirmRemove(true)}>
          <Icon name="person_remove" className="text-[20px]" />
        </IconButton>
      </div>

      <ConfirmDialog
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => { setConfirmRemove(false); onRemove(); }}
        title={`Remove ${displayName}?`}
        message="They'll be removed from your contacts. You can add them again at any time with their email address."
        confirmLabel="Remove"
        danger
      />
    </>
  );
};
