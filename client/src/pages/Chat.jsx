import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
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
import { IconButton } from '../components/ui/IconButton';
import { Avatar } from '../components/ui/Avatar';
import { SkeletonList } from '../components/ui/Skeleton';
import { TextField } from '../components/ui/TextField';
import { useToast } from '../components/ui/Toast';

export const Chat = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const isDesktop = useMediaQuery('(min-width: 768px)');
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
    contacts,
    loadingContacts,
    loadConversations,
    handleSearch,
    startConversation: startConversationBase,
    displayName,
    isUnknownSender,
    handleAddContact: handleAddContactBase,
    handleOpenProfile,
    loadContacts,
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
    retryMessage,
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

  // Every hook reports failures through setError; surface them as toasts so they
  // are visible no matter which screen is open.
  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError('');
  }, [error, toast]);

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

  const showProfile = activeTab === 'profile';

  if (loading && conversations.length === 0) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <Icon name="progress_activity" className="animate-spin text-primary text-[44px] mx-auto mb-sm" />
          <p className="text-content-muted text-body-md">Loading your conversations…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      <InstallPrompt />
      {/* Header */}
      <nav className="bg-surface/85 backdrop-blur-md border-b border-border flex-shrink-0">
        <div className="px-md lg:px-lg h-14 lg:h-16 flex justify-between items-center gap-sm">
          <Link to="/" className="flex items-center gap-2 min-w-0" aria-label="Nexus home">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-surface-inverse flex items-center justify-center flex-shrink-0">
              <span className="font-display text-content-inverse text-lg leading-none pb-0.5">N</span>
            </span>
            <span className="font-display text-title-lg tracking-tight truncate">Nexus</span>
          </Link>

          <div className="flex items-center gap-xs">
            <IconButton
              label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggleTheme}
            >
              <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} className="text-[20px]" />
            </IconButton>
            <button
              type="button"
              onClick={handleOpenProfile}
              aria-label="Your profile"
              className="rounded-full transition-transform duration-fast hover:scale-105 active:scale-95"
            >
              <Avatar name={user?.name} src={user?.avatar} size="sm" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden md:flex-row md:gap-4 lg:gap-6 md:p-4 lg:p-6">
        {isDesktop && <Sidebar
          user={user}
          onOpenContacts={loadContacts}
          loadingConversations={loading}
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
        />}

        {/* Only the active layout is mounted, so a chat never runs two message
            lists, two composers and two sets of effects at once. */}
        {!isDesktop && (
        <div className={`flex-1 flex flex-col min-h-0 ${selectedConversation ? '' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'}`}>
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
              onRetryMessage={retryMessage}
              onUploadSuccess={handleMediaUploadSuccess}
            />
          ) : (
            <>
              {activeTab === 'chats' && (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  <div className="p-sm flex-shrink-0">
                    <TextField
                      icon="search"
                      type="search"
                      placeholder="Search conversations"
                      value={searchQuery}
                      onChange={handleSearch}
                      aria-label="Search conversations"
                    />
                  </div>
                  {loading ? (
                    <SkeletonList count={6} />
                  ) : searchResults.length > 0 ? (
                    <div className="flex-1 overflow-y-auto">
                      {searchResults.map(searchUser => (
                        <SearchResultItem key={searchUser._id} user={searchUser} onClick={() => startConversation(searchUser._id)} />
                      ))}
                    </div>
                  ) : searchQuery.trim().length >= 2 ? (
                    <EmptyState type="noResults" />
                  ) : conversations.length === 0 ? (
                    <EmptyState type="noConversations" onAction={() => setActiveTab('contacts')} />
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
                          currentUserId={user?.id}
                          onDelete={() => handleDeleteConversation(conversation._id)}
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
        )}

        {isDesktop && (
        <div className="flex flex-1 bg-surface rounded-2xl shadow-md border border-border flex-col min-h-0 overflow-hidden relative">
          {showProfile ? (
            <ProfilePanel user={user} onClose={() => setActiveTab('chats')} />
          ) : selectedConversation ? (
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
              onRetryMessage={retryMessage}
              onUploadSuccess={handleMediaUploadSuccess}
              dragDrop={{ isDragging, onDragEnter: handleDragEnter, onDragLeave: handleDragLeave, onDragOver: handleDragOver, onDrop: handleDrop }}
            />
          ) : (
            <EmptyState type="selectConversation" />
          )}
        </div>
        )}
      </div>

      {!isDesktop && <MobileTabBar
        activeTab={activeTab}
        onSelectChats={() => setActiveTab('chats')}
        onSelectContacts={() => {
          setActiveTab('contacts');
          loadContacts();
        }}
        onSelectProfile={handleOpenProfile}
        unreadCount={conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
        hidden={!!selectedConversation}
      />}

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu}
          isCurrentUser={String(contextMenu.sender?._id || contextMenu.sender?.id) === String(user?.id)}
          onClose={() => setContextMenu(null)}
          onDelete={handleDeleteMessage}
        />
      )}
    </div>
  );
};
