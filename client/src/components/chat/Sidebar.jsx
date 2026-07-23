import React, { useState } from 'react';
import { ConversationListItem } from './ConversationListItem';
import { SearchResultItem } from './SearchResultItem';
import { AddContactForm } from './AddContactForm';
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
}) => {
  const [pendingDelete, setPendingDelete] = useState(null);

  const confirmDelete = () => {
    if (pendingDelete) onDeleteConversation(pendingDelete._id);
    setPendingDelete(null);
  };

  return (
    <div className="hidden md:flex md:w-72 lg:w-80 md:flex-col bg-white md:rounded-2xl shadow-lg md:shadow-sm md:border md:border-gray-100 overflow-hidden flex-shrink-0">
      {/* Profile Section */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-600 truncate">{user?.email || 'No email'}</p>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
            </p>
          </div>
          <button
            onClick={onOpenProfile}
            className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Contacts"
            aria-label="Open contacts"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add Contact + Search */}
      <div className="p-3 border-b border-gray-100 space-y-2">
        <AddContactForm
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          addingContact={addingContact}
          contactMessage={contactMessage}
          onSubmit={onAddContact}
        />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={onSearch}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
        />
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
          <div className="p-4 text-center text-gray-500 text-sm">No conversations yet</div>
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
              className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-background rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          This will permanently delete your conversation with{' '}
          <strong>{pendingDelete ? getConversationName(pendingDelete) : ''}</strong>. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};
