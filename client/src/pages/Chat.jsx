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
import { Icon } from '../components/ui/Icon';

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
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="progress_activity" className="animate-spin text-primary text-[48px] mx-auto mb-4" />
          <p className="text-on-surface-variant">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <InstallPrompt />
      {/* Header */}
      <nav className="bg-surface border-b border-outline-variant shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1">
            <Icon name="forum" filled className="text-primary text-[28px]" />
            <h1 className="text-lg sm:text-2xl font-bold text-on-surface">Nexus</h1>
          </div>
          <button
            onClick={logout}
            className="px-3 sm:px-4 py-2 font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors min-h-[40px] flex items-center justify-center"
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
          loadingContacts={loadingContacts}
          contacts={contacts}
          onRemoveContact={handleRemoveContact}
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
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={handleSearch} className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-surface-container-low text-on-surface placeholder:text-outline text-sm" />
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
        <div className="hidden md:flex md:flex-1 bg-surface md:rounded-xl shadow-lg md:border md:border-outline-variant flex-col min-h-0 overflow-hidden relative">
          {selectedConversation ? (
            <ChatWindow
              variant="desktop"
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
