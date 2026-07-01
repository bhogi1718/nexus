import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import chatAPI from '../services/chatService';

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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
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
      setConversations(response.data.conversations || []);
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
      const response = await chatAPI.getMessages(conversationId);
      setMessages(response.data.messages);
      setSelectedConversation(conversationId);
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    setSendingMessage(true);
    const messageContent = messageInput;

    try {
      const response = await chatAPI.sendMessage(selectedConversation, messageContent);
      setMessages([...messages, response.data.message]);
      setMessageInput('');
      setError('');

      // Update last message in conversation list
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
      console.error(err);
    } finally {
      setSendingMessage(false);
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

  const startConversation = async (userId) => {
    try {
      const response = await chatAPI.getOrCreateConversation(userId);
      loadConversations();
      loadMessages(response.data.conversation._id);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setError('Failed to start conversation');
      console.error(err);
    }
  };

  const getConversationName = (conversation) => {
    try {
      if (!conversation || !user || !user.id) return 'Unknown';

      if (conversation.type === 'group') {
        return conversation.name || 'Group Chat';
      }

      if (!conversation.participants || !Array.isArray(conversation.participants) || conversation.participants.length === 0) {
        return 'Unknown';
      }

      const otherUser = conversation.participants.find(p => {
        // Handle both object and string formats
        if (!p) return false;

        const participantId = typeof p === 'string' ? p : p._id;
        const userId = typeof user.id === 'string' ? user.id : user.id.toString();

        if (!participantId) return false;

        const pId = typeof participantId === 'string' ? participantId : participantId.toString();
        return pId !== userId;
      });

      return otherUser ? (typeof otherUser === 'string' ? 'User' : otherUser.name || 'User') : 'Unknown';
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nexus</h1>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Chat Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto gap-6 p-6">
        {/* Conversations Sidebar */}
        <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
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
                conversations.map(conversation => (
                  <button
                    key={conversation._id}
                    onClick={() => loadMessages(conversation._id)}
                    className={`w-full p-4 text-left border-b border-gray-100 transition-colors ${
                      selectedConversation === conversation._id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">
                      {getConversationName(conversation)}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage?.content || 'No messages yet'}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Chat Window */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100">
                {conversations.map(conv => {
                  if (conv._id === selectedConversation) {
                    return (
                      <div key={conv._id}>
                        <h2 className="text-xl font-bold text-gray-900">
                          {getConversationName(conv)}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {conv.participants.length} participants
                        </p>
                      </div>
                    );
                  }
                })}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50" style={{ scrollBehavior: 'smooth' }}>
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map(message => {
                    if (!message || !message.sender) {
                      console.warn('Invalid message structure:', message);
                      return null;
                    }
                    const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
                    const userId = user?.id;
                    const isCurrentUser = senderId && userId && senderId.toString() === userId.toString();
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
                              {message.sender?.name || 'User'}
                            </p>
                          )}
                          <p className="text-sm break-words">{message.content}</p>
                          <p
                            className={`text-xs mt-2 ${
                              isCurrentUser
                                ? 'text-blue-100'
                                : 'text-gray-400'
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
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
                  <input
                    type="text"
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sendingMessage}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageInput.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingMessage ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Send'
                    )}
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
    </div>
  );
};
