import { useEffect, useRef, useState } from 'react';
import {
  initializeSocket,
  subscribe,
  confirmDelivered,
  markConversationRead,
  getConnectionStatus,
} from '../services/socket';
import { decryptMessageIfNeeded } from '../utils/decryptMessageIfNeeded';
import { confirmSent } from './useMessages';

const idOf = (value) => String(value?._id || value?.id || value || '');

const previewText = (message) => {
  if (message.fileUrl) return message.fileName || 'Attachment';
  if (message.undecryptable) return 'Encrypted message';
  return message.content || '';
};

// Adds `userId` to a message's deliveredTo / readBy for a status update.
const applyStatus = (message, { status, userId, at }) => {
  const deliveredTo = message.deliveredTo || [];
  const readBy = message.readBy || [];
  const next = { ...message };
  if (!deliveredTo.some(d => idOf(d) === userId)) next.deliveredTo = [...deliveredTo, userId];
  if (status === 'read' && !readBy.some(r => idOf(r.user) === userId)) {
    next.readBy = [...readBy, { user: userId, readAt: at }];
  }
  return next;
};

const isVisible = () => document.visibilityState === 'visible';

export const useChatSocket = ({
  user,
  setConversations,
  setMessages,
  setTypingUsers,
  selectedConversationRef,
  activeConversationRef,
  loadConversations,
  reloadOpenConversation,
  prefs,
  displayName,
  conversations,
}) => {
  const [connection, setConnection] = useState(getConnectionStatus);
  const lastStatusRef = useRef(getConnectionStatus());

  // Handlers are registered once; this ref gives them the latest values. State
  // updaters below stay pure — side effects are decided from these snapshots.
  const latest = useRef({});
  latest.current = { user, prefs, displayName, loadConversations, reloadOpenConversation, conversations };

  useEffect(() => {
    initializeSocket();
    const me = () => String(latest.current.user?.id);
    const openId = () => selectedConversationRef.current;

    const readOpenConversation = () => {
      const id = openId();
      if (!id || !isVisible()) return;
      markConversationRead(id);
      setConversations(prev => prev.map(c => (c._id === id ? { ...c, unreadCount: 0 } : c)));
    };

    const notifyDesktop = (message, conversation) => {
      const { prefs: p, displayName: name } = latest.current;
      if (!p?.notifications || isVisible() || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      const title = name ? name(message.sender) : (message.sender?.name || 'New message');
      const body = p.notificationPreview ? previewText(message) : 'New message';
      try {
        const n = new Notification(title, { body, tag: conversation?._id || message.conversation, icon: '/favicon.svg' });
        n.onclick = () => { window.focus(); n.close(); };
      } catch {
        // Some browsers only allow notifications from a service worker.
      }
    };

    const unsubscribers = [
      // Messages in the conversation that's open.
      subscribe('message:receive', async (raw) => {
        if (!openId() || String(raw.conversation) !== String(openId())) return;
        const fromMe = idOf(raw.sender) === me();
        const message = await decryptMessageIfNeeded(raw, activeConversationRef.current, latest.current.user);
        // The chat may have been switched while decrypting.
        if (String(raw.conversation) !== String(openId())) return;

        setMessages(prev => {
          if (fromMe && raw.clientId && prev.some(m => m.clientId === raw.clientId)) {
            // Our own message echoed back: confirm it, keep the plaintext we already show.
            return confirmSent(prev, raw.clientId, { _id: raw._id, createdAt: raw.createdAt });
          }
          if (prev.some(m => m._id === raw._id)) return prev;
          return [...prev, fromMe ? { ...message, status: 'sent' } : message];
        });

        if (!fromMe) {
          confirmDelivered([raw._id]);
          readOpenConversation();
        }
      }),

      // Every message in any of my conversations (also those I sent from another tab).
      subscribe('conversation:notify', async (raw) => {
        const fromMe = idOf(raw.sender) === me();
        const isOpen = String(raw.conversation) === String(openId());
        if (!fromMe) confirmDelivered([raw._id]);

        const known = (latest.current.conversations || [])
          .find(c => String(c._id) === String(raw.conversation));
        if (!known) {
          // A chat we haven't loaded (new, or restored after being deleted).
          latest.current.loadConversations();
          return;
        }

        const dec = await decryptMessageIfNeeded(raw, known, latest.current.user);
        const countsAsUnread = !fromMe && !(isOpen && isVisible());
        if (!fromMe) notifyDesktop(dec, known);

        setConversations(prev => {
          const conv = prev.find(c => String(c._id) === String(raw.conversation));
          if (!conv) return prev;
          const updated = {
            ...conv,
            lastMessage: { ...dec, content: previewText(dec), status: fromMe ? 'sent' : undefined },
            lastMessageAt: raw.createdAt || new Date().toISOString(),
            unreadCount: countsAsUnread ? (conv.unreadCount || 0) + 1 : conv.unreadCount || 0,
          };
          // Most recent conversation first, as in every messenger.
          return [updated, ...prev.filter(c => c !== conv)];
        });
      }),

      // Our messages were delivered to / read by someone.
      subscribe('message:status', (update) => {
        const ids = new Set(update.messageIds);
        if (String(update.conversationId) === String(openId())) {
          setMessages(prev => prev.map(m => (ids.has(m._id) ? applyStatus(m, update) : m)));
        }
        setConversations(prev => prev.map(c => (
          c._id === update.conversationId && c.lastMessage && ids.has(c.lastMessage._id)
            ? { ...c, lastMessage: applyStatus(c.lastMessage, update) }
            : c
        )));
      }),

      // Read in another of my tabs: clear the badge here too.
      subscribe('conversation:read', ({ conversationId }) => {
        setConversations(prev => prev.map(c => (c._id === conversationId ? { ...c, unreadCount: 0 } : c)));
      }),

      subscribe('typing:start', ({ userId, conversationId }) => {
        if (String(userId) === me()) return;
        if (conversationId && String(conversationId) !== String(openId())) return;
        setTypingUsers(prev => (prev.includes(userId) ? prev : [...prev, userId]));
      }),

      subscribe('typing:stop', ({ userId }) => {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }),

      subscribe('user:online', ({ userId }) => {
        setConversations(prev => prev.map(conv => ({
          ...conv,
          participants: conv.participants.map(p =>
            (String(p._id) === String(userId) ? { ...p, isOnline: true } : p)),
        })));
      }),

      subscribe('user:offline', ({ userId, lastSeen }) => {
        setConversations(prev => prev.map(conv => ({
          ...conv,
          participants: conv.participants.map(p =>
            (String(p._id) === String(userId) ? { ...p, isOnline: false, lastSeen: lastSeen || p.lastSeen } : p)),
        })));
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }),

      // After a reconnect, events sent while we were away are gone: resync.
      subscribe('connection:status', (status) => {
        const previous = lastStatusRef.current;
        lastStatusRef.current = status;
        setConnection(status);
        if (status === 'connected' && previous === 'reconnecting') {
          latest.current.loadConversations();
          latest.current.reloadOpenConversation?.();
        }
      }),
    ];

    // Coming back to the tab reads whatever arrived while it was hidden.
    const onVisibility = () => { if (isVisible()) readOpenConversation(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubscribers.forEach(off => off());
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [setConversations, setMessages, setTypingUsers, selectedConversationRef, activeConversationRef]);

  return { connection };
};
