import { useState, useRef } from 'react';
import chatAPI from '../services/chatService';
import { encryptMessage, getKeys } from '../services/cryptoService';
import {
  joinConversation,
  leaveConversation,
  sendMessage,
  startTyping,
  stopTyping,
} from '../services/socket';
import { decryptMessageIfNeeded } from '../utils/decryptMessageIfNeeded';

const TYPING_IDLE_MS = 1500;
const PAGE_SIZE = 50;

const newClientId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * Applies the server's confirmation to the local copy of a message we sent.
 * The ack and the broadcast echo can arrive in either order, so both paths call
 * this and whichever comes second is a no-op.
 */
export const confirmSent = (list, clientId, serverFields) =>
  list.map(m => (m.clientId === clientId && m.status !== 'sent'
    ? { ...m, ...serverFields, status: 'sent', isOptimistic: false, failed: false }
    : m));

export const useMessages = ({ user, conversations, setConversations, setTypingUsers, setError, setActiveTab }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const activeConversationRef = useRef(null);
  // Unsent text per conversation, so switching chats doesn't lose a half-typed message.
  const draftsRef = useRef({});

  const me = { _id: user?.id, name: user?.name, avatar: user?.avatar };

  const decrypt = (list, conversation) => list.map(m => decryptMessageIfNeeded(m, conversation, user));

  const loadMessages = async (conversationId) => {
    const previous = selectedConversationRef.current;
    if (previous) {
      draftsRef.current[previous] = messageInput;
      leaveConversation(previous);
      endTyping(previous);
    }

    // Claimed before the request: if another chat is opened while this one is
    // loading, the late response is discarded instead of overwriting it.
    selectedConversationRef.current = conversationId;
    setSelectedConversation(conversationId);
    setMessageInput(draftsRef.current[conversationId] || '');
    setMessages([]);
    setTypingUsers([]);
    setLoadingMessages(true);

    try {
      const response = await chatAPI.getMessages(conversationId, { limit: PAGE_SIZE });
      let conversation = conversations.find(c => c._id === conversationId);
      if (!conversation) {
        conversation = (await chatAPI.getConversationDetails(conversationId)).data.conversation;
      }
      if (selectedConversationRef.current !== conversationId) return;

      activeConversationRef.current = conversation;
      setMessages(decrypt(response.data.messages, conversation));
      setHasMore(Boolean(response.data.hasMore));
      joinConversation(conversationId);

      setConversations(prev => prev.map(c => (c._id === conversationId ? { ...c, unreadCount: 0 } : c)));
      chatAPI.markConversationRead(conversationId).catch(() => {});
    } catch (err) {
      if (selectedConversationRef.current === conversationId) {
        setError(err.response?.data?.message || 'Failed to load messages');
      }
    } finally {
      if (selectedConversationRef.current === conversationId) setLoadingMessages(false);
    }
  };

  // After a reconnect: pull the latest page and merge it in, keeping messages
  // that only exist locally (still sending, or failed) instead of blanking the view.
  const refreshOpenConversation = async () => {
    const conversationId = selectedConversationRef.current;
    if (!conversationId) return;
    try {
      const response = await chatAPI.getMessages(conversationId, { limit: PAGE_SIZE });
      if (selectedConversationRef.current !== conversationId) return;
      const fresh = decrypt(response.data.messages, activeConversationRef.current);
      setMessages(prev => {
        const freshIds = new Set(fresh.map(m => m._id));
        const freshClientIds = new Set(fresh.map(m => m.clientId).filter(Boolean));
        const older = prev.filter(m => !m.isOptimistic && !m.failed && !freshIds.has(m._id)
          && new Date(m.createdAt) < new Date(fresh[0]?.createdAt || 0));
        const localOnly = prev.filter(m => (m.isOptimistic || m.failed) && !freshClientIds.has(m.clientId));
        // Keep the plaintext of our own messages already on screen.
        const known = new Map(prev.filter(m => m._id).map(m => [m._id, m]));
        const merged = fresh.map(m => (known.get(m._id)?.status ? { ...m, content: known.get(m._id).content, status: 'sent' } : m));
        return [...older, ...merged, ...localOnly];
      });
      joinConversation(conversationId);
      chatAPI.markConversationRead(conversationId).catch(() => {});
    } catch {
      // A failed refresh leaves the current view as it was.
    }
  };

  const loadOlder = async () => {
    const conversationId = selectedConversationRef.current;
    const oldest = messages.find(m => !m.isOptimistic && m.createdAt);
    if (!conversationId || !oldest || loadingOlder) return;

    setLoadingOlder(true);
    try {
      const before = new Date(oldest.createdAt).toISOString();
      const response = await chatAPI.getMessages(conversationId, { limit: PAGE_SIZE, before });
      if (selectedConversationRef.current !== conversationId) return;
      const older = decrypt(response.data.messages, activeConversationRef.current);
      setMessages(prev => {
        const seen = new Set(prev.map(m => m._id));
        return [...older.filter(m => !seen.has(m._id)), ...prev];
      });
      setHasMore(Boolean(response.data.hasMore));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load earlier messages');
    } finally {
      setLoadingOlder(false);
    }
  };

  const encryptFor = (conversationId, plaintext) => {
    const conversation = conversations.find(c => c._id === conversationId) || activeConversationRef.current;
    if (!conversation || conversation.type !== 'private' || conversation.participants.length !== 2) {
      return plaintext;
    }
    const keys = getKeys();
    const other = conversation.participants.find(p => String(p._id) !== String(user.id));
    if (!keys.publicKey || !keys.secretKey || !other?.publicKey) return plaintext;
    return encryptMessage(plaintext, other.publicKey, keys.secretKey);
  };

  /**
   * Sends text (and optionally an attachment) with an optimistic bubble. The
   * bubble moves through sending → sent (one tick) → delivered → read; on
   * failure it stays visible as "Not sent" with a retry.
   */
  const sendContent = async (plaintext, media = null, existingClientId = null) => {
    const conversationId = selectedConversationRef.current;
    if (!conversationId) return;
    const clientId = existingClientId || newClientId();

    let wireContent;
    try {
      wireContent = encryptFor(conversationId, plaintext);
    } catch (err) {
      console.error('Encryption error:', err);
      setError('This message could not be encrypted, so it was not sent.');
      if (!media) setMessageInput(plaintext);
      return;
    }

    const optimistic = {
      _id: `temp-${clientId}`,
      clientId,
      conversation: conversationId,
      sender: me,
      content: plaintext,
      createdAt: new Date().toISOString(),
      status: 'sending',
      isOptimistic: true,
      deliveredTo: [],
      readBy: [],
      ...(media && {
        fileUrl: media.fileUrl,
        fileName: media.fileName,
        fileSize: media.fileSize,
        type: media.type,
        media,
      }),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const ack = await sendMessage(conversationId, wireContent, { clientId, media });
      setMessages(prev => confirmSent(prev, clientId, { _id: ack.messageId, createdAt: ack.createdAt }));
      setConversations(prev => prev.map(c => (c._id === conversationId
        ? { ...c, lastMessage: { ...optimistic, _id: ack.messageId, status: 'sent' }, lastMessageAt: ack.createdAt }
        : c)));
    } catch (err) {
      setMessages(prev => prev.map(m => (m.clientId === clientId
        ? { ...m, status: 'failed', failed: true, isOptimistic: false }
        : m)));
      setError(err.message || 'Message not sent. Tap Retry to try again.');
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const conversationId = selectedConversationRef.current;
    if (!messageInput.trim() || !conversationId) return;

    const text = messageInput;
    setMessageInput('');
    delete draftsRef.current[conversationId];
    endTyping(conversationId);
    await sendContent(text);
  };

  const retryMessage = async (failedMessage) => {
    setMessages(prev => prev.filter(m => m.clientId !== failedMessage.clientId));
    await sendContent(failedMessage.content, failedMessage.media || null);
  };

  // One "typing" event per burst, then "stopped" after a pause — not one per keystroke.
  const endTyping = (conversationId) => {
    clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current && conversationId) stopTyping(conversationId);
    isTypingRef.current = false;
  };

  const handleMessageInputChange = (e) => {
    setMessageInput(e.target.value);
    const conversationId = selectedConversationRef.current;
    if (!conversationId) return;

    if (!e.target.value) {
      endTyping(conversationId);
      return;
    }
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(conversationId);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => endTyping(conversationId), TYPING_IDLE_MS);
  };

  const handleMediaUploadSuccess = async (mediaData) => {
    await sendContent(mediaData.fileName, {
      fileUrl: mediaData.url,
      fileName: mediaData.fileName,
      fileSize: mediaData.fileSize,
      type: mediaData.type,
      s3Key: mediaData.s3Key,
    });
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!selectedConversationRef.current) {
      setError('Select a conversation first');
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) fileInputRef.current?.uploadFile(file);
  };

  const handleCloseChat = () => {
    const conversationId = selectedConversationRef.current;
    if (conversationId) {
      draftsRef.current[conversationId] = messageInput;
      leaveConversation(conversationId);
      endTyping(conversationId);
    }
    selectedConversationRef.current = null;
    activeConversationRef.current = null;
    setSelectedConversation(null);
    setMessages([]);
    setHasMore(false);
    setTypingUsers([]);
    setActiveTab('chats');
  };

  const handleDeleteMessage = async () => {
    const target = contextMenu;
    if (!target) return;
    setContextMenu(null);

    // A message that never reached the server only exists locally.
    if (target.failed || String(target._id).startsWith('temp-')) {
      setMessages(prev => prev.filter(m => m._id !== target._id));
      return;
    }
    try {
      await chatAPI.deleteMessage(target._id);
      setMessages(prev => prev.filter(m => m._id !== target._id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete message');
    }
  };

  const handleMessageLongPress = (message) => setContextMenu(message);

  return {
    messages, setMessages,
    messageInput, setMessageInput,
    loadingMessages,
    loadingOlder,
    hasMore,
    loadOlder,
    refreshOpenConversation,
    selectedConversation,
    selectedConversationRef,
    activeConversationRef,
    typingTimeoutRef,
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
  };
};
