import { useState, useEffect } from 'react';
import chatAPI from '../services/chatService';
import { decryptMessageIfNeeded } from '../utils/decryptMessageIfNeeded';

export const useConversations = ({ user, setConversations, setError, setActiveTab }) => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [contactEmail, setContactEmail] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactIds, setContactIds] = useState(new Set());
  const [contactNicknames, setContactNicknames] = useState({});

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
          withStatus.lastMessage = decryptMessageIfNeeded(withStatus.lastMessage, withStatus, user);
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

  // Returns the conversation id on success (so the caller can decide to load it),
  // or null on failure. Does not itself navigate to the conversation.
  const startConversation = async (userId) => {
    try {
      const response = await chatAPI.getOrCreateConversation(userId);
      const conversationId = response.data.conversation._id;
      if (!conversationId) {
        setError('Invalid conversation response from server');
        return null;
      }
      loadConversations();
      setSearchQuery('');
      setSearchResults([]);
      return conversationId;
    } catch (err) {
      setError('Failed to start conversation');
      console.error('Start conversation error:', err);
      return null;
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

  // Returns the new contact's id on success (so the caller can start a conversation
  // with them), or null on failure.
  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!contactEmail.trim()) return null;

    setAddingContact(true);
    setContactMessage('');
    try {
      const response = await chatAPI.addContact(contactEmail.trim());
      setContactIds(prev => new Set([...prev, String(response.data.contact._id)]));
      setContactEmail('');
      setContactMessage(`✓ ${response.data.contact.name} added`);
      setTimeout(() => setContactMessage(''), 3000);
      return response.data.contact._id;
    } catch (err) {
      setContactMessage(err.response?.data?.message || 'Failed to add contact');
      setTimeout(() => setContactMessage(''), 3000);
      return null;
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

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await chatAPI.deleteConversation(conversationId);
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
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

  return {
    loading,
    searchQuery,
    searchResults,
    contactEmail, setContactEmail,
    addingContact,
    contactMessage,
    contacts, setContacts,
    loadingContacts, setLoadingContacts,
    contactIds,
    contactNicknames,
    loadConversations,
    handleSearch,
    startConversation,
    displayName,
    handleSetNickname,
    getOtherParticipant,
    isUnknownSender,
    handleAddContact,
    handleAddUnknownContact,
    handleOpenProfile,
    handleRemoveContact,
    handleDeleteConversation,
    getConversationName,
  };
};
