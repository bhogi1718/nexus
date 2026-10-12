import React, { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';

export const ContactListItem = ({ contact, onMessage, onRemove }) => {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const displayName = contact.nickname || contact.name;

  return (
    <>
      <div className="flex items-center gap-sm px-md py-3 min-h-[68px] transition-colors duration-fast hover:bg-surface-sunken">
        <Avatar name={contact.name} src={contact.avatar} size="md" showStatus isOnline={contact.isOnline} />

        <div className="flex-1 min-w-0">
          <p className="text-title-sm text-content truncate">{displayName}</p>
          <p className="text-body-sm text-content-muted truncate">{contact.email}</p>
        </div>

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
