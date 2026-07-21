import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import chatAPI from '../services/chatService';
import { MediaUploader } from '../components/MediaUploader';
import { MediaMessage } from '../components/MediaMessage';
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
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [contactEmail, setContactEmail] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  // IDs of my contacts — used to flag conversations with unknown senders
  const [contactIds, setContactIds] = useState(new Set());
  // My personal nicknames for contacts: { contactId: nickname }
  const [contactNicknames, setContactNicknames] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  // Refs so the persistent socket listener always sees the CURRENT conversation
  // (state values inside the listener closure would be stale)
  const selectedConversationRef = useRef(null);
  const activeConversationRef = useRef(null);

  useEffect(() => {
    loadConversations();
    // Load contact IDs (to flag unknown senders) and nicknames
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

  // Listen for user online/offline status changes
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

  // Register ONE persistent message listener for the whole component lifetime.
  // Registering/removing listeners per conversation-click was fragile: any
  // mis-timed teardown left the socket in the room with no handler, so
  // messages arrived but never rendered until a refresh.
  useEffect(() => {
    // Guarantee the socket exists before registering listeners —
    // onMessageReceive silently no-ops without one
    const token = localStorage.getItem('token');
    if (token) {
      initializeSocket(token);
    }

    onMessageReceive((message) => {
      const currentConvId = selectedConversationRef.current;
      const conversation = activeConversationRef.current;

      // Only render messages for the conversation currently open
      if (!currentConvId || String(message.conversation) !== String(currentConvId)) {
        return;
      }

      // Ensure sender has the full object structure
      if (message.sender && typeof message.sender === 'object' && !message.sender._id && message.sender.id) {
        message.sender._id = message.sender.id;
      }

      const isMessageFromCurrentUser = String(message.sender?._id || message.sender?.id) === String(user.id);
      const decryptedMsg = decryptMessageIfNeeded(message, conversation);

      setMessages(prev => {
        if (isMessageFromCurrentUser) {
          // Replace the pending optimistic message (its content is already
          // plaintext); adopt the server's populated sender object
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
          // Own message sent from another tab/device — decryption works for
          // own messages too, so just add it
          return [...prev, decryptedMsg];
        }
        return [...prev, decryptedMsg];
      });

      // Update the sidebar preview
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

    // Cross-conversation notifications: bump unread badge + preview for
    // conversations that are NOT currently open
    onConversationNotify((message) => {
      const openId = selectedConversationRef.current;
      if (String(message.conversation) === String(openId)) {
        // Visible right now — mark it read server-side so the count stays 0
        chatAPI.markConversationRead(openId).catch(() => {});
        return;
      }
      setConversations(prev => {
        const exists = prev.some(conv => String(conv._id) === String(message.conversation));
        if (!exists) {
          // Brand-new conversation (someone messaged us for the first time) —
          // it's not in our list yet, so refetch from the server
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

    // Read receipts: when the other person reads the open conversation,
    // flip our sent messages to read (blue ticks)
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-clear errors after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await chatAPI.getConversations();

      // Fetch online users and update participants
      const onlineResponse = await chatAPI.getOnlineUsers();
      const onlineUsersSet = new Set(onlineResponse.data.onlineUsers);

      // Update conversations with online status and decrypt last-message previews
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

  // Heuristic: ciphertext is nonce(24) + box overhead(16) minimum, base64-encoded
  const looksEncrypted = (content) =>
    typeof content === 'string' && content.length >= 50 && /^[A-Za-z0-9+/]+=*$/.test(content);

  // Decrypt a message in a 1:1 private chat.
  // NaCl box uses a shared secret that is symmetric: box(theirPublic, mySecret)
  // equals box(myPublic, theirSecret). So BOTH sent and received messages
  // decrypt with the other participant's public key + this user's secret key.
  const decryptMessageIfNeeded = (message, conversation) => {
    try {
      if (!conversation || conversation.type !== 'private' || conversation.participants?.length !== 2) {
        return message;
      }
      if (!message?.content || message.fileUrl) {
        return message; // media messages are not encrypted
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
        // Either a plaintext message (pre-encryption) or encrypted with rotated/lost keys
        return { ...message, undecryptable: looksEncrypted(message.content) };
      }
    } catch (err) {
      console.error('Decryption error:', err);
      return message;
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      console.log('loadMessages called with:', { conversationId, type: typeof conversationId, length: conversationId?.length });

      // Leave previous conversation room (the persistent listener stays)
      if (selectedConversation) {
        leaveConversation(selectedConversation);
      }

      // Load messages from REST API
      const response = await chatAPI.getMessages(conversationId);

      // Resolve the conversation: state can be stale for just-created
      // conversations, so fall back to fetching it directly
      let conversation = conversations.find(c => c._id === conversationId);
      if (!conversation) {
        const details = await chatAPI.getConversationDetails(conversationId);
        conversation = details.data.conversation;
      }

      // Point the persistent socket listener at this conversation
      selectedConversationRef.current = conversationId;
      activeConversationRef.current = conversation;

      // Decrypt messages if they're from a 1:1 chat
      const decryptedMessages = response.data.messages.map(msg =>
        decryptMessageIfNeeded(msg, conversation)
      );

      setMessages(decryptedMessages);
      setSelectedConversation(conversationId);
      setTypingUsers([]);
      setShowSidebar(false); // Close sidebar on mobile after selecting conversation

      // Join new conversation room
      joinConversation(conversationId);

      // Mark as read: clear the badge locally and persist server-side
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

      // Find the conversation to determine if it's 1:1 or group
      const conversation = conversations.find(c => c._id === selectedConversation);
      let contentToSend = messageContent;
      let isEncrypted = false;

      // For 1:1 chats, encrypt the message on frontend
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

      // Add optimistic message to UI immediately (show plaintext to sender).
      // Normalize sender to include _id — the auth user object only has `id`
      const optimisticMessage = {
        _id: 'temp-' + Date.now(),
        conversation: selectedConversation,
        sender: { ...user, _id: user.id },
        content: messageContent,  // Keep plaintext for sender display
        createdAt: new Date(),
        isOptimistic: true,
        isEncrypted
      };
      setMessages(prev => [...prev, optimisticMessage]);

      try {
        // Use the sendMessage function from socket service with callback support
        console.log('🚀 Sending message via Socket.io...');
        await sendMessage(selectedConversation, contentToSend);
        console.log('✅ Message send completed');
      } catch (err) {
        console.error('❌ Send failed, removing optimistic message:', err);
        // Remove optimistic message on error
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

    // Emit typing start
    if (selectedConversation) {
      startTyping(selectedConversation);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Emit typing stop after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedConversation);
      }, 1000);
    }
  };

  const handleMediaUploadSuccess = async (mediaData) => {
    if (!selectedConversation) return;

    // Add optimistic message to UI immediately
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
      // Send media message via Socket.io with S3 details
      await sendMessage(selectedConversation, mediaData.fileName, {
        fileUrl: mediaData.url,
        fileName: mediaData.fileName,
        fileSize: mediaData.fileSize,
        type: mediaData.type,
        s3Key: mediaData.s3Key
      });
    } catch (err) {
      // Remove optimistic message on error
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
      console.log('API Response:', response.data);
      console.log('Conversation ID:', response.data.conversation._id);
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

  // Display name for another user: my nickname for them wins over their real name
  const displayName = (person) => {
    if (!person) return 'User';
    return contactNicknames[String(person._id || person.id)] || person.name || 'User';
  };

  // Prompt for and save a nickname for a contact
  const handleSetNickname = async (contact) => {
    const current = contactNicknames[String(contact._id)] || '';
    const input = window.prompt(
      `Nickname for ${contact.name} (leave empty to remove):`,
      current
    );
    if (input === null) return; // cancelled

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

  // Get the other participant of a private conversation
  const getOtherParticipant = (conv) => {
    if (!conv || conv.type !== 'private') return null;
    return conv.participants?.find(p => String(p._id) !== String(user?.id)) || null;
  };

  // True when the other participant of a private chat is not in my contacts
  const isUnknownSender = (conv) => {
    const other = getOtherParticipant(conv);
    return !!other && !contactIds.has(String(other._id));
  };

  // Add a contact by exact email, then open a chat with them
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
      // Open a conversation with the new contact right away
      startConversation(response.data.contact._id);
    } catch (err) {
      setContactMessage(err.response?.data?.message || 'Failed to add contact');
      setTimeout(() => setContactMessage(''), 3000);
    } finally {
      setAddingContact(false);
    }
  };

  // Add an unknown sender to contacts directly from their conversation
  const handleAddUnknownContact = async (otherUser) => {
    if (!otherUser?.email) return;
    try {
      const response = await chatAPI.addContact(otherUser.email);
      setContactIds(prev => new Set([...prev, String(response.data.contact._id)]));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add contact');
    }
  };

  // Open the profile modal and load contacts
  const handleOpenProfile = async () => {
    setShowProfile(true);
    setLoadingContacts(true);
    try {
      const response = await chatAPI.getContacts();
      setContacts(response.data.contacts || []);
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

  // Close the open chat window without deleting anything
  const handleCloseChat = () => {
    if (selectedConversation) {
      leaveConversation(selectedConversation);
    }
    selectedConversationRef.current = null;
    activeConversationRef.current = null;
    setSelectedConversation(null);
    setMessages([]);
    setTypingUsers([]);
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    setDeletingConversationId(conversationId);
    try {
      await chatAPI.deleteConversation(conversationId);
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
      selectedConversationRef.current = null;
      activeConversationRef.current = null;
      setSelectedConversation(null);
      setMessages([]);
      setError('');
    } catch (err) {
      setError('Failed to delete conversation');
      console.error(err);
    } finally {
      setDeletingConversationId(null);
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

      // Find the participant that is NOT the current user
      const otherUser = conversation.participants.find(p => {
        if (!p || !p._id) return false;
        // Convert both to string for reliable comparison
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Nexus</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={logout}
              className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm md:text-base"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Chat Area */}
      <div className="flex-1 flex gap-0 md:gap-6 md:p-6 min-h-0 overflow-hidden">
        {/* Conversations Sidebar - Hidden on mobile, visible on md+ */}
        <div className={`${showSidebar ? 'fixed md:relative' : 'hidden'} md:flex md:flex-col inset-0 md:inset-auto md:w-80 bg-white md:rounded-2xl shadow-lg md:shadow-sm md:border md:border-gray-100 flex-col overflow-hidden z-40 md:z-auto`}>
          {/* Your Profile */}
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {user?.email || 'No email'}
                </p>
                <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Online
                </p>
              </div>
              <button
                onClick={handleOpenProfile}
                className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors flex-shrink-0"
                title="My profile & contacts"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <button
                onClick={() => setShowSidebar(false)}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Add contact + search contacts */}
          <div className="p-4 border-b border-gray-100 space-y-2">
            <form onSubmit={handleAddContact} className="flex gap-2">
              <input
                type="email"
                placeholder="Add contact by email..."
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
              />
              <button
                type="submit"
                disabled={addingContact || !contactEmail.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors"
                title="Add contact"
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
              placeholder="Search your contacts..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="flex-1 overflow-y-auto border-b border-gray-100">
              {searchResults.map(searchUser => (
                <button
                  key={searchUser._id}
                  onClick={() => startConversation(searchUser._id)}
                  className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors"
                >
                  <p className="font-semibold text-gray-900">{searchUser.name}</p>
                  <p className="text-sm text-gray-500">{searchUser.email}</p>
                </button>
              ))}
            </div>
          )}

          {/* Conversations List */}
          {searchResults.length === 0 && (
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No conversations yet</div>
              ) : (
                conversations.map(conversation => {
                  const hasUnread = (conversation.unreadCount || 0) > 0;
                  return (
                    <button
                      key={conversation._id}
                      onClick={() => loadMessages(conversation._id)}
                      className={`w-full p-4 text-left border-b border-gray-100 transition-colors ${
                        selectedConversation === conversation._id
                          ? 'bg-blue-50'
                          : hasUnread
                            ? 'bg-blue-50/60 border-l-4 border-l-blue-600 hover:bg-blue-50'
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate flex items-center gap-1.5 ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>
                          {getConversationName(conversation)}
                          {isUnknownSender(conversation) && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full flex-shrink-0">
                              Unknown
                            </span>
                          )}
                        </p>
                        {hasUnread && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                        {conversation.lastMessage?.undecryptable
                          ? '🔒 Encrypted message'
                          : conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Chat Window */}
        <div
          className="flex-1 bg-white md:rounded-2xl shadow-sm md:shadow-sm md:border md:border-gray-100 flex flex-col min-h-0 overflow-hidden relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 rounded-2xl flex items-center justify-center z-40 pointer-events-none">
              <div className="text-center">
                <svg className="w-16 h-16 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-blue-600 font-semibold">Drop file to upload</p>
              </div>
            </div>
          )}
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 bg-white">
                {conversations.map(conv => {
                  if (conv._id === selectedConversation) {
                    const otherUser = conv.type === 'group'
                      ? null
                      : conv.participants.find(p => {
                          if (!p || !p._id) return false;
                          const pId = String(p._id);
                          const userId = String(user.id);
                          return pId !== userId;
                        });

                    return (
                      <div key={conv._id} className="flex items-center justify-between gap-2 md:gap-3">
                        {/* Back button on mobile */}
                        <button
                          onClick={() => setShowSidebar(true)}
                          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
                          title="Back to conversations"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className="w-10 md:w-12 h-10 md:h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-base md:text-lg font-bold flex-shrink-0">
                            {conv.type === 'group'
                              ? conv.name?.charAt(0).toUpperCase() || 'G'
                              : (otherUser?.name?.charAt(0).toUpperCase() || 'U')}
                          </div>

                          {/* Profile Info */}
                          <div className="flex-1 min-w-0">
                            <h2 className="text-base md:text-xl font-bold text-gray-900 truncate">
                              {getConversationName(conv)}
                            </h2>
                            {conv.type === 'group' ? (
                              <p className="text-sm text-gray-500">
                                {conv.participants.length} participants
                              </p>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                  {otherUser?.email || 'No email'}
                                  {isUnknownSender(conv) && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                      Unknown
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {otherUser?.isOnline ? (
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                      Active now
                                    </span>
                                  ) : (
                                    'Offline'
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Add unknown sender to contacts */}
                        {conv.type === 'private' && isUnknownSender(conv) && (
                          <button
                            onClick={() => handleAddUnknownContact(otherUser)}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0 flex items-center gap-1.5"
                            title="Add this person to your contacts"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Add to contacts
                          </button>
                        )}

                        {/* Close Chat Button */}
                        <button
                          onClick={handleCloseChat}
                          className="p-2 rounded-lg transition-colors flex-shrink-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="Close chat"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteConversation(conv._id)}
                          disabled={deletingConversationId === conv._id}
                          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                            deletingConversationId === conv._id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title="Delete conversation"
                        >
                          {deletingConversationId === conv._id ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  }
                })}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 bg-gray-50" style={{ scrollBehavior: 'smooth' }}>
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map(message => {
                    if (!message || !message.sender) {
                      console.warn('Invalid message structure:', message);
                      return null;
                    }
                    // Sender may have _id (from server) or id (from the auth user object)
                    const senderId = typeof message.sender === 'string'
                      ? message.sender
                      : (message.sender?._id || message.sender?.id);
                    const userId = user?.id;
                    if (!senderId || !userId) {
                      console.warn('Missing sender or user ID');
                      return null;
                    }
                    const isCurrentUser = String(senderId) === String(userId);

                    // Sender messages hold plaintext (optimistic) or decrypted text;
                    // receiver messages hold decrypted text. Undecryptable = old/rotated keys.
                    const displayContent = message.undecryptable ? null : message.content;

                    // Tick status for own messages: read (blue ✓✓) > delivered (✓✓) > sent (✓)
                    // readBy/deliveredTo entries may be populated user objects or raw ids
                    const isRead = isCurrentUser && (message.readBy || []).some(
                      r => String(r.user?._id || r.user) !== String(userId)
                    );
                    const isDelivered = isCurrentUser && (message.deliveredTo || []).some(
                      d => String(d?._id || d) !== String(userId)
                    );

                    return (
                      <div
                        key={message._id}
                        className={`flex items-end gap-2 ${
                          isCurrentUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isCurrentUser && (
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {message.sender?.name ? message.sender.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                            isCurrentUser
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
                          }`}
                        >
                          {!isCurrentUser && (
                            <p className="text-xs font-semibold text-gray-500 mb-1">
                              {displayName(message.sender)}
                            </p>
                          )}
                          {message.fileUrl && (
                            <MediaMessage message={message} isCurrentUser={isCurrentUser} />
                          )}
                          {!message.fileUrl && displayContent && (
                            <p className="text-sm break-words">{displayContent}</p>
                          )}
                          {!message.fileUrl && message.undecryptable && (
                            <p className="text-sm italic opacity-60">🔒 Encrypted message</p>
                          )}
                          {message.fileUrl && message.content && message.content.startsWith('[Media:') && (
                            null
                          )}
                          <p
                            className={`text-xs mt-2 flex items-center gap-1 ${
                              isCurrentUser
                                ? 'text-blue-100 justify-end'
                                : 'text-gray-400'
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {isCurrentUser && (
                              <span
                                className={`font-bold tracking-tighter ${
                                  message.isOptimistic
                                    ? 'text-blue-300'
                                    : isRead
                                      ? 'text-cyan-300'
                                      : 'text-blue-100'
                                }`}
                                title={
                                  message.isOptimistic
                                    ? 'Sending...'
                                    : isRead ? 'Read' : isDelivered ? 'Delivered' : 'Sent'
                                }
                              >
                                {message.isOptimistic ? '🕓' : (isRead || isDelivered) ? '✓✓' : '✓'}
                              </span>
                            )}
                          </p>
                        </div>
                        {isCurrentUser && (
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 text-gray-500 text-sm">
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

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
                {error && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <MediaUploader
                    ref={fileInputRef}
                    onUploadSuccess={handleMediaUploadSuccess}
                    conversationId={selectedConversation}
                  />
                  <input
                    type="text"
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    placeholder="Type a message..."
                    className="flex-1 px-3 md:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm md:text-base"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>

      {/* Profile & Contacts Modal */}
      {showProfile && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header: user info */}
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">My Profile</h2>
                <button
                  onClick={() => setShowProfile(false)}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-lg truncate">{user?.name}</p>
                  <p className="text-sm text-blue-100 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Contacts list */}
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">
                Contacts {!loadingContacts && `(${contacts.length})`}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingContacts ? (
                <div className="p-6 text-center text-gray-500 text-sm">Loading contacts...</div>
              ) : contacts.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No contacts yet. Add one by email from the sidebar.
                </div>
              ) : (
                contacts.map(contact => (
                  <div
                    key={contact._id}
                    className="flex items-center gap-3 p-4 border-b border-gray-50 hover:bg-gray-50"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {contact.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {contact.nickname || contact.name}
                        {contact.nickname && (
                          <span className="ml-1.5 text-xs font-normal text-gray-400">({contact.name})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                    </div>
                    <button
                      onClick={() => handleSetNickname(contact)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                      title="Set nickname"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        startConversation(contact._id);
                      }}
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Message"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveContact(contact._id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove contact"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
