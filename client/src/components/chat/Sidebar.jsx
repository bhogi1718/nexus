import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { ConversationListItem } from './ConversationListItem';
import { SearchResultItem } from './SearchResultItem';
import { AddContactForm } from './AddContactForm';
import { ContactListItem } from './ContactListItem';
import { EmptyState } from '../EmptyState';
import { Modal } from '../ui/Modal';

export const Sidebar = ({
  user,
  onOpenProfile,
  contactEmail,
  setContactEmail,
  addingContact,
  contactMessage,
  onAddContact,
  searchQuery,
  onSearch,
  searchResults,
  conversations,
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
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showContacts, setShowContacts] = useState(false);

  const confirmDelete = () => {
    if (pendingDelete) onDeleteConversation(pendingDelete._id);
    setPendingDelete(null);
  };

  const handleOpenContacts = async () => {
    await onOpenProfile();
    setShowContacts(true);
  };

  const handleMessageContact = (contactId) => {
    setShowContacts(false);
    onStartConversation(contactId);
  };

  return (
    <div className="hidden md:flex md:w-72 lg:w-80 md:flex-col bg-surface-container md:rounded-xl shadow-lg md:border md:border-outline-variant overflow-hidden flex-shrink-0">
      {/* Profile Section */}
      <div className="p-4 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container text-lg font-bold ring-2 ring-primary">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-surface-container" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline-md text-headline-md font-bold text-primary truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-on-surface-variant truncate">{user?.email || 'No email'}</p>
          </div>
          <button
            onClick={handleOpenContacts}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Contacts"
            aria-label="Open contacts"
          >
            <Icon name="contacts" className="text-[22px]" />
          </button>
        </div>
      </div>

      {/* Add Contact + Search */}
      <div className="p-3 border-b border-outline-variant space-y-2">
        <AddContactForm
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          addingContact={addingContact}
          contactMessage={contactMessage}
          onSubmit={onAddContact}
        />
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={onSearch}
            className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-surface-container-low text-on-surface placeholder:text-outline text-sm"
          />
        </div>
      </div>

      {/* Conversations/Search Results */}
      <div className="flex-1 overflow-y-auto">
        {searchResults.length > 0 ? (
          searchResults.map(searchUser => (
            <SearchResultItem
              key={searchUser._id}
              user={searchUser}
              onClick={() => onStartConversation(searchUser._id)}
            />
          ))
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-on-surface-variant text-sm">No conversations yet</div>
        ) : (
          conversations.map(conversation => (
            <ConversationListItem
              key={conversation._id}
              conversation={conversation}
              isSelected={selectedConversation === conversation._id}
              name={getConversationName(conversation)}
              isUnknown={isUnknownSender(conversation)}
              onClick={() => onSelectConversation(conversation._id)}
              onDelete={() => setPendingDelete(conversation)}
              padding="p-3"
            />
          ))
        )}
      </div>

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete conversation?"
        footer={
          <>
            <button
              onClick={() => setPendingDelete(null)}
              className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-semibold text-on-error bg-error rounded-lg hover:opacity-90 transition-opacity"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          This will permanently delete your conversation with{' '}
          <strong className="text-on-surface">{pendingDelete ? getConversationName(pendingDelete) : ''}</strong>. This action cannot be undone.
        </p>
      </Modal>

      <Modal
        isOpen={showContacts}
        onClose={() => setShowContacts(false)}
        title="Contacts"
      >
        <div className="-m-4">
          <div className="p-3 border-b border-outline-variant">
            <AddContactForm
              contactEmail={contactEmail}
              setContactEmail={setContactEmail}
              addingContact={addingContact}
              contactMessage={contactMessage}
              onSubmit={onAddContact}
            />
          </div>
          {loadingContacts ? (
            <EmptyState type="noContacts" />
          ) : !contacts || contacts.length === 0 ? (
            <EmptyState type="noContacts" />
          ) : (
            contacts.map(contact => (
              <ContactListItem
                key={contact._id}
                contact={contact}
                onMessage={() => handleMessageContact(contact._id)}
                onRemove={() => onRemoveContact(contact._id)}
              />
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
