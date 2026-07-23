import React from 'react';
import { AddContactForm } from './AddContactForm';
import { ContactListItem } from './ContactListItem';
import { EmptyState } from '../EmptyState';

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
}) => {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="p-3 border-b border-gray-100 flex-shrink-0">
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
          <EmptyState type="noContacts" />
        ) : contacts.length === 0 ? (
          <EmptyState type="noContacts" />
        ) : (
          contacts.map(contact => (
            <ContactListItem
              key={contact._id}
              contact={contact}
              onMessage={() => onMessageContact(contact._id)}
              onRemove={() => onRemoveContact(contact._id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
