import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
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
import { ContactInfoPanel } from '../components/chat/ContactInfoPanel';
import { SettingsPanel } from '../components/chat/SettingsPanel';
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
  const { prefs } = usePreferences();
  const toast = useToast();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  // Wide enough to show contact info beside the chat instead of over it.
  const isWide = useMediaQuery('(min-width: 1280px)');

  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'contacts' | 'profile' (settings)
  const [infoUserId, setInfoUserId] = useState(null);

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
    handleSetNickname,
    isUnknownSender,
    handleAddContact: handleAddContactBase,
    handleAddUnknownContact,
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
    loadingOlder,
    hasMore,
    loadOlder,
    refreshOpenConversation,
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

  const { connection } = useChatSocket({
    user,
    setConversations,
    setMessages,
    setTypingUsers,
    selectedConversationRef,
    activeConversationRef,
    loadConversations,
    reloadOpenConversation: refreshOpenConversation,
    prefs,
    displayName,
    conversations,
  });

  // Every hook reports failures through setError; surface them as toasts so they
  // are visible no matter which screen is open.
  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError('');
  }, [error, toast]);

  // Starting a conversation needs both hooks: create/find it, then load it.
  const startConversation = async (userId) => {
    const conversationId = await startConversationBase(userId);
    if (conversationId) {
      setActiveTab('chats');
      loadMessages(conversationId);
    }
    return conversationId;
  };

  const handleAddContact = async (e) => {
    const contactId = await handleAddContactBase(e);
    if (contactId) await startConversation(contactId);
  };

  const openChat = (conversationId) => {
    setInfoUserId(null);
    loadMessages(conversationId);
  };

  const closeChat = () => {
    setInfoUserId(null);
    handleCloseChat();
  };

  const deleteChat = async (conversationId) => {
    if (conversationId === selectedConversationRef.current) closeChat();
    await handleDeleteConversation(conversationId);
  };

  const messageFromInfo = async (userId) => {
    setInfoUserId(null);
    await startConversation(userId);
  };

  const openSettings = () => {
    setInfoUserId(null);
    handleOpenProfile();
  };

  const selectedConversationObj = conversations.find(c => c._id === selectedConversation);
  const showSettings = activeTab === 'profile';

  // Live presence for the open profile, kept current by socket events.
  const livePresence = infoUserId
    ? conversations.flatMap(c => c.participants || []).find(p => String(p._id) === String(infoUserId))
    : null;

  const contactInfo = infoUserId && (
    <ContactInfoPanel
      key={infoUserId}
      userId={infoUserId}
      livePresence={livePresence}
      onClose={() => setInfoUserId(null)}
      onMessage={messageFromInfo}
      onAddContact={handleAddUnknownContact}
      onRemoveContact={handleRemoveContact}
      onSetNickname={handleSetNickname}
      onDeleteChat={deleteChat}
      isOpenChat={Boolean(selectedConversationObj?.participants?.some(p => String(p._id) === String(infoUserId)))}
    />
  );

  const chatWindow = (variant) => selectedConversation && (
    <ChatWindow
      variant={variant}
      conversation={selectedConversationObj}
      onBack={closeChat}
      messages={messages}
      loadingMessages={loadingMessages}
      user={user}
      displayName={displayName}
      onMessageLongPress={handleMessageLongPress}
      onRetryMessage={retryMessage}
      typingUsers={typingUsers}
      messageInput={messageInput}
      onMessageInputChange={handleMessageInputChange}
      onSendMessage={handleSendMessage}
      fileInputRef={fileInputRef}
      onUploadSuccess={handleMediaUploadSuccess}
      onOpenInfo={setInfoUserId}
      hasMore={hasMore}
      loadingOlder={loadingOlder}
      onLoadOlder={loadOlder}
      dragDrop={variant === 'desktop'
        ? { isDragging, onDragEnter: handleDragEnter, onDragLeave: handleDragLeave, onDragOver: handleDragOver, onDrop: handleDrop }
        : undefined}
    />
  );

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
              onClick={openSettings}
              aria-label="Settings"
              title="Settings"
              className="rounded-full transition-transform duration-fast hover:scale-105 active:scale-95"
            >
              <Avatar name={user?.name} src={user?.avatar} size="sm" />
            </button>
          </div>
        </div>
      </nav>

      {connection === 'reconnecting' && (
        <div role="status" className="flex-shrink-0 flex items-center justify-center gap-sm px-md py-1.5 bg-warning-subtle text-warning text-caption font-semibold animate-fade-in">
          <Icon name="sync" className="text-[16px] animate-spin" />
          Connecting… messages will send when you're back online.
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden md:flex-row md:gap-4 lg:gap-6 md:p-4 lg:p-6">
        {isDesktop && (
          <Sidebar
            user={user}
            onOpenContacts={loadContacts}
            onOpenContactInfo={setInfoUserId}
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
            onSelectConversation={openChat}
            onStartConversation={startConversation}
            onDeleteConversation={deleteChat}
            getConversationName={getConversationName}
            loadingContacts={loadingContacts}
            contacts={contacts}
            onRemoveContact={handleRemoveContact}
            isUnknownSender={isUnknownSender}
          />
        )}

        {/* Only the active layout is mounted, so a chat never runs two message
            lists, two composers and two sets of effects at once. */}
        {!isDesktop && (
          <div className={`flex-1 flex flex-col min-h-0 ${selectedConversation ? '' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'}`}>
            {selectedConversation ? chatWindow('mobile') : (
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
                      <EmptyState type="noConversations" onAction={() => { setActiveTab('contacts'); loadContacts(); }} />
                    ) : (
                      <div className="flex-1 overflow-y-auto">
                        {conversations.map(conversation => (
                          <ConversationListItem
                            key={conversation._id}
                            conversation={conversation}
                            isSelected={false}
                            name={getConversationName(conversation)}
                            isUnknown={isUnknownSender(conversation)}
                            onClick={() => openChat(conversation._id)}
                            currentUserId={user?.id}
                            onDelete={() => deleteChat(conversation._id)}
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
                    onOpenInfo={setInfoUserId}
                  />
                )}

                {activeTab === 'profile' && <SettingsPanel />}
              </>
            )}
          </div>
        )}

        {isDesktop && (
          <div className="flex flex-1 bg-surface rounded-2xl shadow-md border border-border min-h-0 overflow-hidden relative">
            {showSettings ? (
              <SettingsPanel onClose={() => setActiveTab('chats')} />
            ) : selectedConversation ? (
              <>
                <div className="flex-1 min-w-0 flex flex-col relative">{chatWindow('desktop')}</div>
                {contactInfo && (isWide ? (
                  <aside className="w-[24rem] flex-shrink-0 border-l border-border flex flex-col animate-fade-in">{contactInfo}</aside>
                ) : (
                  <aside className="absolute inset-0 z-20 flex flex-col">{contactInfo}</aside>
                ))}
              </>
            ) : contactInfo ? (
              <div className="flex-1 flex flex-col">{contactInfo}</div>
            ) : (
              <EmptyState type="selectConversation" />
            )}
          </div>
        )}
      </div>

      {/* Phones: contact info covers the whole screen. */}
      {!isDesktop && contactInfo && (
        <div className="fixed inset-0 z-40 flex flex-col bg-bg">{contactInfo}</div>
      )}

      {!isDesktop && (
        <MobileTabBar
          activeTab={activeTab}
          onSelectChats={() => setActiveTab('chats')}
          onSelectContacts={() => {
            setActiveTab('contacts');
            loadContacts();
          }}
          onSelectProfile={openSettings}
          unreadCount={conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
          hidden={!!selectedConversation || !!infoUserId}
        />
      )}

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
