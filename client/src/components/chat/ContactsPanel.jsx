import React from 'react';
import { AddContactForm } from './AddContactForm';
import { ContactListItem } from './ContactListItem';
import { EmptyState } from '../EmptyState';
import { SkeletonList } from '../ui/Skeleton';

export const ContactsPanel = ({
  contactEmail,
  setContactEmail,
  addingContact,
  contactMessage,
  onAddContact,
  loadingContacts,
  contacts,
  onMessageContact,
  onRemoveContact,
  onOpenInfo,
}) => (
  <div className="flex-1 overflow-y-auto flex flex-col bg-bg">
    <div className="px-md pt-md pb-sm flex-shrink-0">
      <h2 className="text-display-md font-display mb-sm">Contacts</h2>
      <AddContactForm
        contactEmail={contactEmail}
        setContactEmail={setContactEmail}
        addingContact={addingContact}
        contactMessage={contactMessage}
        onSubmit={onAddContact}
      />
    </div>

    <div className="flex-1 overflow-y-auto">
      {loadingContacts ? (
        <SkeletonList count={5} />
      ) : !contacts || contacts.length === 0 ? (
        <EmptyState type="noContacts" />
      ) : (
        <div className="mx-md mb-md bg-surface border border-border rounded-xl shadow-xs overflow-hidden divide-y divide-border">
          {contacts.map(contact => (
            <ContactListItem
              key={contact._id}
              contact={contact}
              onMessage={() => onMessageContact(contact._id)}
              onRemove={() => onRemoveContact(contact._id)}
              onOpenInfo={onOpenInfo}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);
