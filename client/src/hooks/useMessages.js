import { useState, useRef, useEffect } from 'react';
import chatAPI from '../services/chatService';
import { encryptMessage, getKeys } from '../services/cryptoService';
import {
  getSocket,
  joinConversation,
  leaveConversation,
  sendMessage,
  startTyping,
  stopTyping,
} from '../services/socket';
import { decryptMessageIfNeeded } from '../utils/decryptMessageIfNeeded';

export const useMessages = ({ user, conversations, setConversations, setTypingUsers, setError, setActiveTab }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const activeConversationRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (conversationId) => {
    try {
      if (selectedConversation) {
        leaveConversation(selectedConversation);
      }

      setLoadingMessages(true);
      const response = await chatAPI.getMessages(conversationId);
      let conversation = conversations.find(c => c._id === conversationId);
      if (!conversation) {
        const details = await chatAPI.getConversationDetails(conversationId);
        conversation = details.data.conversation;
      }

      selectedConversationRef.current = conversationId;
      activeConversationRef.current = conversation;

      const decryptedMessages = response.data.messages.map(msg =>
        decryptMessageIfNeeded(msg, conversation, user)
      );

      setMessages(decryptedMessages);
      setSelectedConversation(conversationId);
      setTypingUsers([]);
      setLoadingMessages(false);

      joinConversation(conversationId);

      setConversations(prev => prev.map(c =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c
      ));
      chatAPI.markConversationRead(conversationId).catch(() => {});
    } catch (err) {
      setError('Failed to load messages');
      setLoadingMessages(false);
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

  const handleDeleteMessage = async () => {
    if (!contextMenu) return;
    try {
      await chatAPI.deleteMessage(contextMenu._id);
      setMessages(prev => prev.filter(m => m._id !== contextMenu._id));
      setContextMenu(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete message');
      setContextMenu(null);
    }
  };

  const handleMessageLongPress = (message) => {
    setContextMenu(message);
  };

  return {
    messages, setMessages,
    messageInput, setMessageInput,
    loadingMessages,
    selectedConversation,
    selectedConversationRef,
    activeConversationRef,
    messagesEndRef,
    typingTimeoutRef,
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
  };
};
