import { useEffect } from 'react';
import chatAPI from '../services/chatService';
import {
  initializeSocket,
  onMessageReceive,
  onConversationNotify,
  onMessagesRead,
  onTypingStart,
  onTypingStop,
  onUserOnline,
  onUserOffline,
  offMessageReceive,
  offConversationNotify,
  offMessagesRead,
  offTypingStart,
  offTypingStop,
  offUserOnline,
  offUserOffline,
} from '../services/socket';
import { decryptMessageIfNeeded } from '../utils/decryptMessageIfNeeded';

export const useChatSocket = ({
  user,
  setConversations,
  setMessages,
  setTypingUsers,
  selectedConversationRef,
  activeConversationRef,
  loadConversations,
}) => {
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
      const decryptedMsg = decryptMessageIfNeeded(message, conversation, user);

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
          const dec = decryptMessageIfNeeded(message, conv, user);
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
};
