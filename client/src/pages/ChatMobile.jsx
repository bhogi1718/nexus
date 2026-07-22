import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { chatAPI } from '../services/chatService';
import { sendMessage as sendMsg, onMessageReceive, offMessageReceive } from '../services/socket';
import { decryptMessage } from '../services/cryptoService';

export const ChatMobile = () => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await chatAPI.getConversations();
        setConversations(response.data || []);
      } catch (err) {
        setError('Failed to load conversations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await chatAPI.getMessages(selectedConversation.conversationId);
        setMessages(response.data || []);
      } catch (err) {
        setError('Failed to load messages');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (message) => {
      if (message.conversationId === selectedConversation?.conversationId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    onMessageReceive(handleNewMessage);
    return () => offMessageReceive();
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const content = newMessage;
      await sendMsg(selectedConversation.conversationId, content);
      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    }
  };

  const getOtherParticipant = (conv) => {
    return conv.participants.find((p) => p.userId !== user?.userId);
  };

  const looksEncrypted = (content) =>
    typeof content === 'string' && content.length >= 50 && /^[A-Za-z0-9+/]+=*$/.test(content);

  const displayMessage = (msg) => {
    try {
      if (looksEncrypted(msg.content)) {
        return decryptMessage(msg.content) || '[Encrypted Message]';
      }
      return msg.content;
    } catch (err) {
      return '[Unable to decrypt]';
    }
  };

  // Show conversation list
  if (!selectedConversation) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3">
          <h2 className="text-lg font-bold text-gray-800">Messages</h2>
          <p className="text-xs text-gray-500">{conversations.length} conversations</p>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-center px-4">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const other = getOtherParticipant(conv);
                return (
                  <button
                    key={conv.conversationId}
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b transition-colors"
                  >
                    <p className="font-medium text-gray-800">{other?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{other?.email}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show chat screen
  const otherParticipant = getOtherParticipant(selectedConversation);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            setSelectedConversation(null);
            setMessages([]);
          }}
          className="p-1 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{otherParticipant?.name}</p>
          <p className="text-xs text-gray-500">{otherParticipant?.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.messageId}
              className={`flex ${msg.senderId === user?.userId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  msg.senderId === user?.userId
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="break-words">{displayMessage(msg)}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && <div className="px-4 py-2 bg-red-50 text-red-600 text-xs">{error}</div>}

      {/* Input */}
      <div className="bg-white border-t px-4 py-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
};
