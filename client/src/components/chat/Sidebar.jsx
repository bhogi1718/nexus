import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { SkeletonList } from '../ui/Skeleton';
import { TextField } from '../ui/TextField';
import { ConversationListItem } from './ConversationListItem';
import { SearchResultItem } from './SearchResultItem';
import { AddContactForm } from './AddContactForm';
import { ContactListItem } from './ContactListItem';
import { EmptyState } from '../EmptyState';

export const Sidebar = ({
  user,
  onOpenContacts,
  contactEmail,
  setContactEmail,
  addingContact,
  contactMessage,
  onAddContact,
  searchQuery,
  onSearch,
  searchResults,
  conversations,
  loadingConversations,
  selectedConversation,
  onSelectConversation,
  onStartConversation,
  onDeleteConversation,
  getConversationName,
  isUnknownSender,
  loadingContacts,
  contacts,
  onRemoveContact,
}) => {
  const [showContacts, setShowContacts] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  const handleOpenContacts = () => {
    onOpenContacts?.();
    setShowContacts(true);
  };

  const handleMessageContact = (contactId) => {
    setShowContacts(false);
    onStartConversation(contactId);
  };

  const handleAddContact = async (e) => {
    await onAddContact(e);
    setShowAddContact(false);
  };

  const searching = searchQuery.trim().length >= 2;

  return (
    <aside
      aria-label="Conversations"
      className="hidden md:flex md:w-80 lg:w-[22rem] md:flex-col bg-surface md:rounded-2xl shadow-md md:border md:border-border overflow-hidden flex-shrink-0"
    >
      {/* Header */}
      <div className="px-md pt-md pb-sm flex items-center justify-between">
        <h2 className="text-display-md font-display">Chats</h2>
        <div className="flex items-center gap-xs">
          <IconButton label="Contacts" onClick={handleOpenContacts}>
            <Icon name="contacts" className="text-[22px]" />
          </IconButton>
          <IconButton label="Add a contact" variant="accent" onClick={() => setShowAddContact(true)}>
            <Icon name="person_add" className="text-[22px]" />
          </IconButton>
        </div>
      </div>

      {/* Search */}
      <div className="px-md pb-sm">
        <TextField
          icon="search"
          type="search"
          placeholder="Search conversations"
          value={searchQuery}
          onChange={onSearch}
          aria-label="Search conversations"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loadingConversations ? (
          <SkeletonList count={7} />
        ) : searchResults.length > 0 ? (
          searchResults.map(searchUser => (
            <SearchResultItem
              key={searchUser._id}
              user={searchUser}
              onClick={() => onStartConversation(searchUser._id)}
            />
          ))
        ) : searching ? (
          <EmptyState type="noResults" />
        ) : conversations.length === 0 ? (
          <EmptyState type="noConversations" onAction={() => setShowAddContact(true)} />
        ) : (
          conversations.map(conversation => (
            <ConversationListItem
              key={conversation._id}
              conversation={conversation}
              isSelected={selectedConversation === conversation._id}
              name={getConversationName(conversation)}
              isUnknown={isUnknownSender(conversation)}
              onClick={() => onSelectConversation(conversation._id)}
              onDelete={() => onDeleteConversation(conversation._id)}
              currentUserId={user?.id}
            />
          ))
        )}
      </div>

      <Modal isOpen={showAddContact} onClose={() => setShowAddContact(false)} title="Add a contact">
        <p className="text-body-md text-content-secondary mb-md">
          Enter the email address they signed up with. They'll appear in your contacts right away.
        </p>
        <AddContactForm
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          addingContact={addingContact}
          contactMessage={contactMessage}
          onSubmit={handleAddContact}
        />
      </Modal>

      <Modal isOpen={showContacts} onClose={() => setShowContacts(false)} title="Contacts" padded={false}>
        {loadingContacts ? (
          <SkeletonList count={5} />
        ) : !contacts || contacts.length === 0 ? (
          <EmptyState type="noContacts" />
        ) : (
          <div className="divide-y divide-border">
            {contacts.map(contact => (
              <ContactListItem
                key={contact._id}
                contact={contact}
                onMessage={() => handleMessageContact(contact._id)}
                onRemove={() => onRemoveContact(contact._id)}
              />
            ))}
          </div>
        )}
      </Modal>
    </aside>
  );
};
