import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import chatAPI from '../services/chatService';
import { MediaUploader } from '../components/MediaUploader';
import { MediaMessage } from '../components/MediaMessage';
import { InstallPrompt } from '../components/InstallPrompt';
import { encryptMessage, decryptMessage, getKeys } from '../services/cryptoService';
import {
  getSocket,
  initializeSocket,
  joinConversation,
  leaveConversation,
  sendMessage,
  startTyping,
  stopTyping,
  onMessageReceive,
  onConversationNotify,
  onMessagesRead,
  onTypingStart,
  onTypingStop,
  offMessageReceive,
  offConversationNotify,
  offMessagesRead,
  offTypingStart,
  offTypingStop,
  onUserOnline,
  onUserOffline,
  offUserOnline,
  offUserOffline
} from '../services/socket';

export const Chat = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [contactEmail, setContactEmail] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactIds, setContactIds] = useState(new Set());
  const [contactNicknames, setContactNicknames] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // Mobile tabs: 'chats', 'contacts', 'profile'
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const activeConversationRef = useRef(null);

  useEffect(() => {
    loadConversations();
    chatAPI.getContacts()
      .then(res => {
        const list = res.data.contacts || [];
        setContactIds(new Set(list.map(c => String(c._id))));
        const nicknames = {};
        list.forEach(c => { if (c.nickname) nicknames[String(c._id)] = c.nickname; });
        setContactNicknames(nicknames);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleUserOnline = ({ userId }) => {
      setConversations(prev => prev.map(conv => ({
        ...conv,
        participants: conv.participants.map(p =>
          String(p._id) === String(userId) ? { ...p, isOnline: true } : p
        )
      })));
    };

    const handleUserOffline = ({ userId }) => {
      setConversations(prev => prev.map(conv => ({
        ...conv,
        participants: conv.participants.map(p =>
          String(p._id) === String(userId) ? { ...p, isOnline: false } : p
        )
      })));
    };

    onUserOnline(handleUserOnline);
    onUserOffline(handleUserOffline);

    return () => {
      offUserOnline();
      offUserOffline();
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      initializeSocket(token);
    }

    onMessageReceive((message) => {
      const currentConvId = selectedConversationRef.current;
      const conversation = activeConversationRef.current;

      if (!currentConvId || String(message.conversation) !== String(currentConvId)) {
        return;
      }

      if (message.sender && typeof message.sender === 'object' && !message.sender._id && message.sender.id) {
        message.sender._id = message.sender.id;
      }

      const isMessageFromCurrentUser = String(message.sender?._id || message.sender?.id) === String(user.id);
      const decryptedMsg = decryptMessageIfNeeded(message, conversation);

      setMessages(prev => {
        if (isMessageFromCurrentUser) {
          const optimisticMsg = prev.find(m => m.isOptimistic);
          if (optimisticMsg) {
            return prev.map(m =>
              m.isOptimistic
                ? {
                    ...m,
                    _id: message._id,
                    sender: message.sender,
                    deliveredTo: message.deliveredTo || [],
                    readBy: message.readBy || [],
                    isOptimistic: false
                  }
                : m
            );
          }
          return [...prev, decryptedMsg];
        }
        return [...prev, decryptedMsg];
      });

      let previewContent = decryptedMsg.undecryptable ? '🔒 Encrypted message' : decryptedMsg.content;
      if (message.fileUrl && message.fileName) {
        previewContent = message.fileName;
      }
      setConversations(prev => prev.map(conv =>
        conv._id === currentConvId
          ? { ...conv, lastMessage: { ...message, content: previewContent }, lastMessageAt: new Date() }
          : conv
      ));
    });

    onTypingStart(({ userId }) => {
      if (String(userId) !== String(user.id)) {
        setTypingUsers(prev => [...new Set([...prev, userId])]);
      }
    });

    onTypingStop(({ userId }) => {
      setTypingUsers(prev => prev.filter(id => id !== userId));
    });

    onConversationNotify((message) => {
      const openId = selectedConversationRef.current;
      if (String(message.conversation) === String(openId)) {
        chatAPI.markConversationRead(openId).catch(() => {});
        return;
      }
      setConversations(prev => {
        const exists = prev.some(conv => String(conv._id) === String(message.conversation));
        if (!exists) {
          setTimeout(() => loadConversations(), 0);
          return prev;
        }
        return prev.map(conv => {
          if (String(conv._id) !== String(message.conversation)) return conv;
          const dec = decryptMessageIfNeeded(message, conv);
          let preview = dec.undecryptable ? '🔒 Encrypted message' : dec.content;
          if (message.fileUrl && message.fileName) preview = message.fileName;
          return {
            ...conv,
            unreadCount: (conv.unreadCount || 0) + 1,
            lastMessage: { ...message, content: preview },
            lastMessageAt: new Date()
          };
        });
      });
    });

    onMessagesRead(({ conversationId, readerId }) => {
      if (String(conversationId) !== String(selectedConversationRef.current)) return;
      setMessages(prev => prev.map(m => {
        const senderId = m.sender?._id || m.sender?.id || m.sender;
        if (String(senderId) !== String(user.id)) return m;
        const alreadyRead = (m.readBy || []).some(r => String(r.user?._id || r.user) === String(readerId));
        return alreadyRead ? m : { ...m, readBy: [...(m.readBy || []), { user: readerId, readAt: new Date() }] };
      }));
    });

    return () => {
      offMessageReceive();
      offConversationNotify();
      offMessagesRead();
      offTypingStart();
      offTypingStop();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const looksEncrypted = (content) =>
    typeof content === 'string' && content.length >= 50 && /^[A-Za-z0-9+/]+=*$/.test(content);

  const decryptMessageIfNeeded = (message, conversation) => {
    try {
      if (!conversation || conversation.type !== 'private' || conversation.participants?.length !== 2) {
        return message;
      }
      if (!message?.content || message.fileUrl) {
        return message;
      }

      const keys = getKeys();
      const otherParticipant = conversation.participants.find(
        p => String(p._id) !== String(user?.id)
      );

      if (!keys?.secretKey || !otherParticipant?.publicKey) {
        return message;
      }

      try {
        const decrypted = decryptMessage(message.content, otherParticipant.publicKey, keys.secretKey);
        return { ...message, content: decrypted, isDecrypted: true };
      } catch (e) {
        return { ...message, undecryptable: looksEncrypted(message.content) };
      }
    } catch (err) {
      console.error('Decryption error:', err);
      return message;
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await chatAPI.getConversations();
      const onlineResponse = await chatAPI.getOnlineUsers();
      const onlineUsersSet = new Set(onlineResponse.data.onlineUsers);

      const conversationsWithStatus = response.data.conversations.map(conv => {
        const withStatus = {
          ...conv,
          participants: conv.participants.map(p => ({
            ...p,
            isOnline: onlineUsersSet.has(String(p._id))
          }))
        };
        if (withStatus.lastMessage?.content) {
          withStatus.lastMessage = decryptMessageIfNeeded(withStatus.lastMessage, withStatus);
        }
        return withStatus;
      });

      setConversations(conversationsWithStatus || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err.response?.data?.message || 'Failed to load conversations');
      setLoading(false);
      setConversations([]);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      if (selectedConversation) {
        leaveConversation(selectedConversation);
      }

      const response = await chatAPI.getMessages(conversationId);
      let conversation = conversations.find(c => c._id === conversationId);
      if (!conversation) {
        const details = await chatAPI.getConversationDetails(conversationId);
        conversation = details.data.conversation;
      }

      selectedConversationRef.current = conversationId;
      activeConversationRef.current = conversation;

      const decryptedMessages = response.data.messages.map(msg =>
        decryptMessageIfNeeded(msg, conversation)
      );

      setMessages(decryptedMessages);
      setSelectedConversation(conversationId);
      setTypingUsers([]);

      joinConversation(conversationId);

      setConversations(prev => prev.map(c =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c
      ));
      chatAPI.markConversationRead(conversationId).catch(() => {});
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const messageContent = messageInput;
    setMessageInput('');
    stopTyping(selectedConversation);

    try {
      const socket = getSocket();
      if (!socket?.connected) {
        setError('Connection lost. Please check your internet connection.');
        setMessageInput(messageContent);
        return;
      }

      const conversation = conversations.find(c => c._id === selectedConversation);
      let contentToSend = messageContent;
      let isEncrypted = false;

      if (conversation && conversation.type === 'private' && conversation.participants.length === 2) {
        try {
          const keys = getKeys();
          if (keys.publicKey && keys.secretKey) {
            const otherParticipant = conversation.participants.find(
              p => String(p._id) !== String(user.id)
            );

            if (otherParticipant?.publicKey) {
              contentToSend = encryptMessage(messageContent, otherParticipant.publicKey, keys.secretKey);
              isEncrypted = true;
            }
          }
        } catch (encryptErr) {
          console.error('Encryption error:', encryptErr);
          setError('Failed to encrypt message');
          setMessageInput(messageContent);
          return;
        }
      }

      const optimisticMessage = {
        _id: 'temp-' + Date.now(),
        conversation: selectedConversation,
        sender: { ...user, _id: user.id },
        content: messageContent,
        createdAt: new Date(),
        isOptimistic: true,
        isEncrypted
      };
      setMessages(prev => [...prev, optimisticMessage]);

      try {
        await sendMessage(selectedConversation, contentToSend);
      } catch (err) {
        setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
        setError(err.message || 'Failed to send message');
        setMessageInput(messageContent);
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
      setMessageInput(messageContent);
      console.error('Send message error:', err);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await chatAPI.searchUsers(query);
      setSearchResults(response.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessageInputChange = (e) => {
    setMessageInput(e.target.value);

    if (selectedConversation) {
      startTyping(selectedConversation);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedConversation);
      }, 1000);
    }
  };

  const handleMediaUploadSuccess = async (mediaData) => {
    if (!selectedConversation) return;

    const optimisticMessage = {
      _id: 'temp-' + Date.now(),
      conversation: selectedConversation,
      sender: { ...user, _id: user.id },
      content: mediaData.fileName,
      fileUrl: mediaData.url,
      fileName: mediaData.fileName,
      fileSize: mediaData.fileSize,
      type: mediaData.type,
      createdAt: new Date(),
      isOptimistic: true
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      await sendMessage(selectedConversation, mediaData.fileName, {
        fileUrl: mediaData.url,
        fileName: mediaData.fileName,
        fileSize: mediaData.fileSize,
        type: mediaData.type,
        s3Key: mediaData.s3Key
      });
    } catch (err) {
      setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
      setError(err.message || 'Failed to send media');
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!selectedConversation) {
      setError('Select a conversation first');
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInputRef.current?.uploadFile(files[0]);
    }
  };

  const startConversation = async (userId) => {
    try {
      const response = await chatAPI.getOrCreateConversation(userId);
      const conversationId = response.data.conversation._id;
      if (!conversationId) {
        setError('Invalid conversation response from server');
        return;
      }
      loadConversations();
      loadMessages(conversationId);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setError('Failed to start conversation');
      console.error('Start conversation error:', err);
    }
  };

  const displayName = (person) => {
    if (!person) return 'User';
    return contactNicknames[String(person._id || person.id)] || person.name || 'User';
  };

  const handleSetNickname = async (contact) => {
    const current = contactNicknames[String(contact._id)] || '';
    const input = window.prompt(
      `Nickname for ${contact.name} (leave empty to remove):`,
      current
    );
    if (input === null) return;

    try {
      const response = await chatAPI.setContactNickname(contact._id, input);
      setContactNicknames(prev => {
        const next = { ...prev };
        if (response.data.nickname) {
          next[String(contact._id)] = response.data.nickname;
        } else {
          delete next[String(contact._id)];
        }
        return next;
      });
      setContacts(prev => prev.map(c =>
        c._id === contact._id ? { ...c, nickname: response.data.nickname } : c
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set nickname');
    }
  };

  const getOtherParticipant = (conv) => {
    if (!conv || conv.type !== 'private') return null;
    return conv.participants?.find(p => String(p._id) !== String(user?.id)) || null;
  };

  const isUnknownSender = (conv) => {
    const other = getOtherParticipant(conv);
    return !!other && !contactIds.has(String(other._id));
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!contactEmail.trim()) return;

    setAddingContact(true);
    setContactMessage('');
    try {
      const response = await chatAPI.addContact(contactEmail.trim());
      setContactIds(prev => new Set([...prev, String(response.data.contact._id)]));
      setContactEmail('');
      setContactMessage(`✓ ${response.data.contact.name} added`);
      setTimeout(() => setContactMessage(''), 3000);
      startConversation(response.data.contact._id);
    } catch (err) {
      setContactMessage(err.response?.data?.message || 'Failed to add contact');
      setTimeout(() => setContactMessage(''), 3000);
    } finally {
      setAddingContact(false);
    }
  };

  const handleAddUnknownContact = async (otherUser) => {
    if (!otherUser?.email) return;
    try {
      const response = await chatAPI.addContact(otherUser.email);
      setContactIds(prev => new Set([...prev, String(response.data.contact._id)]));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add contact');
    }
  };

  const handleOpenProfile = async () => {
    setLoadingContacts(true);
    try {
      const response = await chatAPI.getContacts();
      setContacts(response.data.contacts || []);
      setActiveTab('profile');
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      await chatAPI.removeContact(contactId);
      setContacts(prev => prev.filter(c => c._id !== contactId));
      setContactIds(prev => {
        const next = new Set(prev);
        next.delete(String(contactId));
        return next;
      });
    } catch (err) {
      console.error('Failed to remove contact:', err);
    }
  };

  const handleCloseChat = () => {
    if (selectedConversation) {
      leaveConversation(selectedConversation);
    }
    selectedConversationRef.current = null;
    activeConversationRef.current = null;
    setSelectedConversation(null);
    setMessages([]);
    setTypingUsers([]);
    setActiveTab('chats');
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await chatAPI.deleteConversation(conversationId);
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
      setSelectedConversation(null);
      setMessages([]);
      setError('');
    } catch (err) {
      setError('Failed to delete conversation');
      console.error(err);
    }
  };

  const getConversationName = (conversation) => {
    try {
      if (!conversation || !user) return 'Unknown';

      if (conversation.type === 'group') {
        return conversation.name || 'Group Chat';
      }

      if (!conversation.participants || conversation.participants.length === 0) {
        return 'Unknown';
      }

      const otherUser = conversation.participants.find(p => {
        if (!p || !p._id) return false;
        const pId = String(p._id);
        const userId = String(user.id);
        return pId !== userId;
      });

      return otherUser ? displayName(otherUser) : 'Unknown';
    } catch (error) {
      console.error('Error in getConversationName:', error);
      return 'Unknown';
    }
  };

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
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden lg:flex-row lg:gap-6 lg:p-6">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:flex lg:w-80 lg:flex-col bg-white lg:rounded-2xl shadow-lg lg:shadow-sm lg:border lg:border-gray-100 overflow-hidden flex-shrink-0">
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
                onClick={handleOpenProfile}
                className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
                title="Contacts"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Add Contact + Search */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <form onSubmit={handleAddContact} className="flex gap-1.5">
              <input
                type="email"
                placeholder="Add contact..."
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-xs sm:text-sm"
              />
              <button
                type="submit"
                disabled={addingContact || !contactEmail.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                +
              </button>
            </form>
            {contactMessage && (
              <p className={`text-xs ${contactMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {contactMessage}
              </p>
            )}
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-xs sm:text-sm"
            />
          </div>

          {/* Conversations/Search Results */}
          <div className="flex-1 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map(searchUser => (
                <button
                  key={searchUser._id}
                  onClick={() => startConversation(searchUser._id)}
                  className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors"
                >
                  <p className="font-semibold text-gray-900 text-sm">{searchUser.name}</p>
                  <p className="text-xs text-gray-500">{searchUser.email}</p>
                </button>
              ))
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No conversations yet</div>
            ) : (
              conversations.map(conversation => {
                const hasUnread = (conversation.unreadCount || 0) > 0;
                return (
                  <button
                    key={conversation._id}
                    onClick={() => loadMessages(conversation._id)}
                    className={`w-full p-3 text-left border-b border-gray-100 transition-colors min-h-[70px] flex flex-col justify-center ${
                      selectedConversation === conversation._id
                        ? 'bg-blue-50'
                        : hasUnread
                          ? 'bg-blue-50/60 border-l-4 border-l-blue-600 hover:bg-blue-50'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate flex items-center gap-1.5 flex-1 ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'} text-sm`}>
                        {getConversationName(conversation)}
                        {isUnknownSender(conversation) && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full flex-shrink-0">
                            Unknown
                          </span>
                        )}
                      </p>
                      {hasUnread && (
                        <span className="flex-shrink-0 min-w-[24px] h-6 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-1 ${hasUnread ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                      {conversation.lastMessage?.undecryptable
                        ? '🔒 Encrypted message'
                        : conversation.lastMessage?.content || 'No messages yet'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile Tab Content - Hidden on desktop */}
        <div className="flex-1 flex flex-col min-h-0 lg:hidden pb-16">
          {selectedConversation ? (
            /* Chat View */
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-gray-100 bg-white flex-shrink-0">
                {conversations.map(conv => {
                  if (conv._id === selectedConversation) {
                    const otherUser = conv.type === 'group' ? null : conv.participants.find(p => String(p._id) !== String(user.id));
                    return (
                      <div key={conv._id} className="flex items-center justify-between gap-2">
                        <button
                          onClick={handleCloseChat}
                          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-base font-bold text-gray-900 truncate">{getConversationName(conv)}</h2>
                          <p className="text-xs text-gray-500">
                            {conv.type === 'group' ? `${conv.participants.length} members` : (otherUser?.isOnline ? 'Online' : 'Offline')}
                          </p>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12 text-sm">No messages yet</div>
                ) : (
                  messages.map(message => {
                    if (!message || !message.sender) return null;
                    const senderId = message.sender?._id || message.sender?.id;
                    const isCurrentUser = String(senderId) === String(user?.id);
                    const displayContent = message.undecryptable ? null : message.content;
                    const isRead = isCurrentUser && (message.readBy || []).some(r => String(r.user?._id || r.user) !== String(user.id));
                    const isDelivered = isCurrentUser && (message.deliveredTo || []).some(d => String(d?._id || d) !== String(user.id));

                    return (
                      <div key={message._id} className={`flex items-end gap-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        {!isCurrentUser && (
                          <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {message.sender?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${isCurrentUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'}`}>
                          {!isCurrentUser && (
                            <p className="text-xs font-semibold text-gray-500 mb-0.5">{displayName(message.sender)}</p>
                          )}
                          {message.fileUrl && <MediaMessage message={message} isCurrentUser={isCurrentUser} />}
                          {!message.fileUrl && displayContent && <p className="text-sm break-words">{displayContent}</p>}
                          {message.undecryptable && <p className="text-sm italic opacity-60">🔒 Encrypted</p>}
                          <p className={`text-xs mt-1 flex items-center gap-0.5 ${isCurrentUser ? 'text-blue-100 justify-end' : 'text-gray-400'}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isCurrentUser && (
                              <span className={`font-bold ${message.isOptimistic ? 'text-blue-300' : isRead ? 'text-cyan-300' : 'text-blue-100'}`}>
                                {message.isOptimistic ? '🕓' : (isRead || isDelivered) ? '✓✓' : '✓'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-1 px-3 py-1 text-gray-500 text-xs">
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    </span>
                    Someone is typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex-shrink-0">
                {error && (
                  <div className="mb-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    <MediaUploader ref={fileInputRef} onUploadSuccess={handleMediaUploadSuccess} conversationId={selectedConversation} />
                  </div>
                  <input type="text" value={messageInput} onChange={handleMessageInputChange} placeholder="Type..." className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[40px]" />
                  <button type="submit" disabled={!messageInput.trim()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 text-sm min-w-[40px] min-h-[40px] flex items-center justify-center">
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Tab Content */
            <>
              {/* Chats Tab */}
              {activeTab === 'chats' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="p-3 space-y-2">
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={handleSearch} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  {searchResults.length > 0 ? (
                    searchResults.map(searchUser => (
                      <button key={searchUser._id} onClick={() => startConversation(searchUser._id)} className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors">
                        <p className="font-semibold text-gray-900 text-sm">{searchUser.name}</p>
                        <p className="text-xs text-gray-500">{searchUser.email}</p>
                      </button>
                    ))
                  ) : conversations.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">No conversations yet</div>
                  ) : (
                    conversations.map(conversation => {
                      const hasUnread = (conversation.unreadCount || 0) > 0;
                      return (
                        <button key={conversation._id} onClick={() => loadMessages(conversation._id)} className={`w-full p-4 text-left border-b border-gray-100 transition-colors min-h-[70px] flex flex-col justify-center ${hasUnread ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className={`truncate flex items-center gap-1.5 flex-1 ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'} text-sm`}>
                              {getConversationName(conversation)}
                              {isUnknownSender(conversation) && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Unknown</span>}
                            </p>
                            {hasUnread && <span className="flex-shrink-0 min-w-[24px] h-6 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span>}
                          </div>
                          <p className={`text-xs truncate mt-1 ${hasUnread ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                            {conversation.lastMessage?.undecryptable ? '🔒 Encrypted' : conversation.lastMessage?.content || 'No messages yet'}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === 'contacts' && (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  <div className="p-3 space-y-2 border-b border-gray-100">
                    <form onSubmit={handleAddContact} className="flex gap-2">
                      <input type="email" placeholder="Add contact..." value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm" />
                      <button type="submit" disabled={addingContact || !contactEmail.trim()} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors min-h-[40px]">
                        +
                      </button>
                    </form>
                    {contactMessage && <p className={`text-xs ${contactMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{contactMessage}</p>}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {loadingContacts ? (
                      <div className="p-6 text-center text-gray-500 text-sm">Loading...</div>
                    ) : contacts.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 text-sm">No contacts yet</div>
                    ) : (
                      contacts.map(contact => (
                        <div key={contact._id} className="flex items-center gap-3 p-4 border-b border-gray-50 hover:bg-gray-50">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {contact.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{contact.nickname || contact.name}</p>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                          <button onClick={() => startConversation(contact._id)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>
                          <button onClick={() => handleRemoveContact(contact._id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center flex-shrink-0">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <p className="font-bold text-lg">{user?.name}</p>
                    <p className="text-sm text-blue-100 mb-2">{user?.email}</p>
                    <p className="text-sm text-green-300 flex items-center justify-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span> Online
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Desktop Chat Area */}
        <div className="hidden lg:flex lg:flex-1 bg-white lg:rounded-2xl shadow-lg shadow-sm border border-gray-100 flex-col min-h-0 overflow-hidden" onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 rounded-2xl flex items-center justify-center z-40 pointer-events-none">
              <svg className="w-16 h-16 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          )}
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-gray-100 bg-white flex-shrink-0">
                {conversations.find(c => c._id === selectedConversation) && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{getConversationName(conversations.find(c => c._id === selectedConversation))}</h2>
                    <p className="text-sm text-gray-500">
                      {conversations.find(c => c._id === selectedConversation)?.type === 'group' ? `${conversations.find(c => c._id === selectedConversation)?.participants.length} members` : 'Direct message'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">No messages yet</div>
                ) : (
                  messages.map(message => {
                    if (!message || !message.sender) return null;
                    const senderId = message.sender?._id || message.sender?.id;
                    const isCurrentUser = String(senderId) === String(user?.id);
                    const displayContent = message.undecryptable ? null : message.content;
                    const isRead = isCurrentUser && (message.readBy || []).some(r => String(r.user?._id || r.user) !== String(user.id));
                    const isDelivered = isCurrentUser && (message.deliveredTo || []).some(d => String(d?._id || d) !== String(user.id));

                    return (
                      <div key={message._id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        {!isCurrentUser && (
                          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {message.sender?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className={`max-w-sm px-4 py-3 rounded-2xl ${isCurrentUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'}`}>
                          {!isCurrentUser && <p className="text-xs font-semibold text-gray-500 mb-1">{displayName(message.sender)}</p>}
                          {message.fileUrl && <MediaMessage message={message} isCurrentUser={isCurrentUser} />}
                          {!message.fileUrl && displayContent && <p className="break-words">{displayContent}</p>}
                          {message.undecryptable && <p className="italic opacity-60">🔒 Encrypted message</p>}
                          <p className={`text-xs mt-2 flex items-center gap-0.5 ${isCurrentUser ? 'text-blue-100 justify-end' : 'text-gray-400'}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isCurrentUser && (
                              <span className={`font-bold ${message.isOptimistic ? 'text-blue-300' : isRead ? 'text-cyan-300' : 'text-blue-100'}`}>
                                {message.isOptimistic ? '🕓' : (isRead || isDelivered) ? '✓✓' : '✓'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-1 px-4 py-2 text-gray-500 text-sm">
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    </span>
                    Someone is typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
                {error && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    <MediaUploader ref={fileInputRef} onUploadSuccess={handleMediaUploadSuccess} conversationId={selectedConversation} />
                  </div>
                  <input type="text" value={messageInput} onChange={handleMessageInputChange} placeholder="Type a message..." className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" disabled={!messageInput.trim()} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 min-h-[40px] flex items-center justify-center">
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">Select a conversation to start chatting</div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Tabs - Hidden on desktop */}
      {!selectedConversation && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around flex-shrink-0">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-3 px-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'chats' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-6 h-6" fill={activeTab === 'chats' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-medium">Chats</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('contacts');
              setLoadingContacts(true);
              chatAPI.getContacts()
                .then(res => setContacts(res.data.contacts || []))
                .catch(() => setContacts([]))
                .finally(() => setLoadingContacts(false));
            }}
            className={`flex-1 py-3 px-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'contacts' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-6 h-6" fill={activeTab === 'contacts' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-xs font-medium">Contacts</span>
          </button>
          <button
            onClick={handleOpenProfile}
            className={`flex-1 py-3 px-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-6 h-6" fill={activeTab === 'profile' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      )}
    </div>
  );
};
