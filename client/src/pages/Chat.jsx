import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import chatAPI from '../services/chatService';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';
import { useChatSocket } from '../hooks/useChatSocket';
import { InstallPrompt } from '../components/InstallPrompt';
import { MessageContextMenu } from '../components/MessageContextMenu';
import { EmptyState } from '../components/EmptyState';
import { Sidebar } from '../components/chat/Sidebar';
import { MobileTabBar } from '../components/chat/MobileTabBar';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ContactsPanel } from '../components/chat/ContactsPanel';
import { ProfilePanel } from '../components/chat/ProfilePanel';
import { SearchResultItem } from '../components/chat/SearchResultItem';
import { ConversationListItem } from '../components/chat/ConversationListItem';

export const Chat = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('chats'); // Mobile tabs: 'chats', 'contacts', 'profile'

  const {
    loading,
    searchQuery,
    searchResults,
    contactEmail, setContactEmail,
    addingContact,
    contactMessage,
    contacts, setContacts,
    loadingContacts, setLoadingContacts,
    loadConversations,
    handleSearch,
    startConversation: startConversationBase,
    displayName,
    isUnknownSender,
    handleAddContact: handleAddContactBase,
    handleOpenProfile,
    handleRemoveContact,
    handleDeleteConversation,
    getConversationName,
  } = useConversations({ user, setConversations, setError, setActiveTab });

  const {
    messages, setMessages,
    messageInput,
    loadingMessages,
    selectedConversation,
    selectedConversationRef,
    activeConversationRef,
    fileInputRef,
    contextMenu, setContextMenu,
    isDragging,
    loadMessages,
    handleSendMessage,
    handleMessageInputChange,
    handleMediaUploadSuccess,
    handleDragEnter, handleDragLeave, handleDragOver, handleDrop,
    handleCloseChat,
    handleDeleteMessage,
    handleMessageLongPress,
  } = useMessages({ user, conversations, setConversations, setTypingUsers, setError, setActiveTab });

  useChatSocket({
    user,
    setConversations,
    setMessages,
    setTypingUsers,
    selectedConversationRef,
    activeConversationRef,
    loadConversations,
  });

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Composed wrappers: starting a conversation (from search results or contacts)
  // must both create/find the conversation AND load its messages. These two
  // steps live in different hooks, so Chat.jsx composes them here.
  const startConversation = async (userId) => {
    const conversationId = await startConversationBase(userId);
    if (conversationId) {
      loadMessages(conversationId);
    }
  };

  const handleAddContact = async (e) => {
    const contactId = await handleAddContactBase(e);
    if (contactId) {
      await startConversation(contactId);
    }
  };

  const selectedConversationObj = conversations.find(c => c._id === selectedConversation);

  if (loading && conversations.length === 0) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <InstallPrompt />
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1">
            <div className="inline-flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 bg-blue-600 rounded-lg flex-shrink-0">
              <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Nexus</h1>
          </div>
          <button
            onClick={logout}
            className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-xs sm:text-sm min-h-[40px] flex items-center justify-center"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden md:flex-row md:gap-4 lg:gap-6 md:p-4 lg:p-6">
        <Sidebar
          user={user}
          onOpenProfile={handleOpenProfile}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          addingContact={addingContact}
          contactMessage={contactMessage}
          onAddContact={handleAddContact}
          searchQuery={searchQuery}
          onSearch={handleSearch}
          searchResults={searchResults}
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={loadMessages}
          onStartConversation={startConversation}
          onDeleteConversation={handleDeleteConversation}
          getConversationName={getConversationName}
          isUnknownSender={isUnknownSender}
        />

        {/* Mobile Tab Content - Hidden on tablet/desktop */}
        <div className="flex-1 flex flex-col min-h-0 md:hidden pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {selectedConversation ? (
            <ChatWindow
              variant="mobile"
              conversation={selectedConversationObj}
              onBack={handleCloseChat}
              messages={messages}
              loadingMessages={loadingMessages}
              user={user}
              displayName={displayName}
              onMessageLongPress={handleMessageLongPress}
              typingUsers={typingUsers}
              messageInput={messageInput}
              onMessageInputChange={handleMessageInputChange}
              onSendMessage={handleSendMessage}
              fileInputRef={fileInputRef}
              error={error}
              onUploadSuccess={handleMediaUploadSuccess}
            />
          ) : (
            <>
              {activeTab === 'chats' && (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  <div className="p-3 space-y-2 flex-shrink-0">
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={handleSearch} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="flex-1 overflow-y-auto">
                      {searchResults.map(searchUser => (
                        <SearchResultItem key={searchUser._id} user={searchUser} onClick={() => startConversation(searchUser._id)} />
                      ))}
                    </div>
                  ) : conversations.length === 0 ? (
                    <EmptyState type="noConversations" />
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      {conversations.map(conversation => (
                        <ConversationListItem
                          key={conversation._id}
                          conversation={conversation}
                          isSelected={false}
                          name={getConversationName(conversation)}
                          isUnknown={isUnknownSender(conversation)}
                          onClick={() => loadMessages(conversation._id)}
                          padding="p-4"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'contacts' && (
                <ContactsPanel
                  contactEmail={contactEmail}
                  setContactEmail={setContactEmail}
                  addingContact={addingContact}
                  contactMessage={contactMessage}
                  onAddContact={handleAddContact}
                  loadingContacts={loadingContacts}
                  contacts={contacts}
                  onMessageContact={startConversation}
                  onRemoveContact={handleRemoveContact}
                />
              )}

              {activeTab === 'profile' && <ProfilePanel user={user} />}
            </>
          )}
        </div>

        {/* Unified Chat Area (Tablet/Desktop) */}
        <div className="hidden md:flex md:flex-1 bg-white md:rounded-2xl shadow-lg md:shadow-sm md:border md:border-gray-100 flex-col min-h-0 overflow-hidden relative">
          {selectedConversation ? (
            <ChatWindow
              variant="desktop"
              conversation={selectedConversationObj}
              messages={messages}
              loadingMessages={loadingMessages}
              user={user}
              displayName={displayName}
              onMessageLongPress={handleMessageLongPress}
              typingUsers={typingUsers}
              messageInput={messageInput}
              onMessageInputChange={handleMessageInputChange}
              onSendMessage={handleSendMessage}
              fileInputRef={fileInputRef}
              error={error}
              onUploadSuccess={handleMediaUploadSuccess}
              dragDrop={{ isDragging, onDragEnter: handleDragEnter, onDragLeave: handleDragLeave, onDragOver: handleDragOver, onDrop: handleDrop }}
            />
          ) : (
            <EmptyState type="selectConversation" />
          )}
        </div>
      </div>

      <MobileTabBar
        activeTab={activeTab}
        onSelectChats={() => setActiveTab('chats')}
        onSelectContacts={() => {
          setActiveTab('contacts');
          setLoadingContacts(true);
          chatAPI.getContacts()
            .then(res => setContacts(res.data.contacts || []))
            .catch(() => setContacts([]))
            .finally(() => setLoadingContacts(false));
        }}
        onSelectProfile={handleOpenProfile}
      />

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu}
          isCurrentUser={String(contextMenu.sender?._id || contextMenu.sender?.id) === String(user?.id)}
          onClose={() => setContextMenu(null)}
          onCopy={() => setContextMenu(null)}
          onDelete={handleDeleteMessage}
        />
      )}
    </div>
  );
};
