import React from 'react';
import { Icon } from '../ui/Icon';

export const ContactListItem = ({ contact, onMessage, onRemove }) => (
  <div className="flex items-center gap-3 p-4 border-b border-outline-variant hover:bg-surface-container-high">
    <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container font-bold flex-shrink-0">
      {contact.name?.charAt(0).toUpperCase() || '?'}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-on-surface text-sm truncate">{contact.nickname || contact.name}</p>
      <p className="text-xs text-on-surface-variant truncate">{contact.email}</p>
    </div>
    <button onClick={onMessage} aria-label="Message contact" className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <Icon name="chat" className="text-[18px]" />
    </button>
    <button onClick={onRemove} aria-label="Remove contact" className="p-2 rounded-lg text-error hover:bg-error/10 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <Icon name="person_remove" className="text-[18px]" />
    </button>
  </div>
);
