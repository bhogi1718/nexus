import { useState, useEffect, useRef } from 'react';
import chatAPI from '../services/chatService';
import { decryptMessageIfNeeded } from '../utils/decryptMessageIfNeeded';

const SEARCH_DEBOUNCE_MS = 250;

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

  const hasLoadedRef = useRef(false);
  const searchSeqRef = useRef(0);
  const searchTimerRef = useRef(null);

  // Only the first load shows skeletons; later refreshes (new chat, reconnect)
  // update in place instead of blanking the list.
  const loadConversations = async () => {
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const response = await chatAPI.getConversations();
      // Presence (isOnline / lastSeen) arrives with each participant, already
      // filtered through both users' privacy settings.
      const list = await Promise.all((response.data.conversations || []).map(async (conv) => (
        conv.lastMessage?.content
          ? { ...conv, lastMessage: await decryptMessageIfNeeded(conv.lastMessage, conv, user) }
          : conv
      )));
      list.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      setConversations(list);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err.response?.data?.message || 'Failed to load conversations');
      if (!hasLoadedRef.current) setConversations([]);
    } finally {
      setLoading(false);
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

  // Debounced, and stale responses are dropped so a slow early request can't
  // overwrite the results for what the user has typed since.
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    clearTimeout(searchTimerRef.current);
    const seq = ++searchSeqRef.current;

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await chatAPI.searchUsers(query.trim());
        if (seq === searchSeqRef.current) setSearchResults(response.data.users || []);
      } catch (err) {
        console.error(err);
      }
    }, SEARCH_DEBOUNCE_MS);
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

  // Returns true on success so the caller can close its editor.
  const handleSetNickname = async (contactId, nickname) => {
    try {
      const response = await chatAPI.setContactNickname(contactId, nickname);
      const saved = response.data.nickname;
      setContactNicknames(prev => {
        const next = { ...prev };
        if (saved) next[String(contactId)] = saved;
        else delete next[String(contactId)];
        return next;
      });
      setContacts(prev => prev.map(c => (c._id === contactId ? { ...c, nickname: saved } : c)));
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set nickname');
      return false;
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
    if (!otherUser?.email) return false;
    try {
      const response = await chatAPI.addContact(otherUser.email);
      setContactIds(prev => new Set([...prev, String(response.data.contact._id)]));
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add contact');
      return false;
    }
  };

  const loadContacts = async () => {
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

  const handleOpenProfile = () => setActiveTab('profile');

  const handleRemoveContact = async (contactId) => {
    try {
      await chatAPI.removeContact(contactId);
      setContacts(prev => prev.filter(c => c._id !== contactId));
      setContactIds(prev => {
        const next = new Set(prev);
        next.delete(String(contactId));
        return next;
      });
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove contact');
      return false;
    }
  };

  // Confirmation is handled by the caller (a Modal), not here.
  const handleDeleteConversation = async (conversationId) => {
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
    loadContacts,
    handleRemoveContact,
    handleDeleteConversation,
    getConversationName,
  };
};
