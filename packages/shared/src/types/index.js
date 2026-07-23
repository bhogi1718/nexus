/**
 * Types Module
 *
 * TypeScript JSDoc type definitions for IDE autocomplete
 * Even though this is JavaScript, these help with development experience
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {string} publicKey - User's public encryption key (base64)
 * @property {string} secretKey - User's secret encryption key (base64, for retrieval only)
 * @property {boolean} isOnline - Whether user is currently online
 */

/**
 * @typedef {Object} Conversation
 * @property {string} _id - Conversation ID
 * @property {string} type - Conversation type: 'private' or 'group'
 * @property {string} name - Conversation name (for groups)
 * @property {User[]} participants - List of participants
 * @property {Message} lastMessage - Last message in conversation
 * @property {Date} lastMessageAt - Timestamp of last message
 * @property {number} unreadCount - Number of unread messages
 */

/**
 * @typedef {Object} Message
 * @property {string} _id - Message ID
 * @property {string} conversation - Conversation ID
 * @property {User} sender - Message sender
 * @property {string} content - Message content (encrypted or plaintext)
 * @property {string} fileUrl - Optional file URL for media messages
 * @property {string} fileName - Optional file name
 * @property {number} fileSize - Optional file size
 * @property {string} type - Message type: 'text' or 'file'
 * @property {Date} createdAt - Message creation timestamp
 * @property {Object[]} readBy - Array of read receipts
 * @property {Object[]} deliveredTo - Array of delivery receipts
 */

/**
 * @typedef {Object} Contact
 * @property {string} _id - Contact ID
 * @property {string} name - Contact name
 * @property {string} email - Contact email
 * @property {string} nickname - Optional nickname
 * @property {string} publicKey - Contact's public key
 */

/**
 * @typedef {Object} AuthResponse
 * @property {User} user - Authenticated user
 * @property {string} accessToken - JWT access token
 * @property {string} refreshToken - Refresh token for getting new access tokens
 */

/**
 * @typedef {Object} StorageAdapter
 * @property {Function} getItem - Get value from storage
 * @property {Function} setItem - Set value in storage
 * @property {Function} removeItem - Remove value from storage
 * @property {Function} clear - Clear all storage
 */

/**
 * @typedef {Object} ConfigAdapter
 * @property {Function} getApiUrl - Get API URL
 * @property {Function} getSocketUrl - Get Socket.IO URL
 * @property {Function} getEnvironment - Get environment (development or production)
 */

/**
 * @typedef {Object} NavigationAdapter
 * @property {Function} redirectToLogin - Redirect to login
 * @property {Function} redirect - Redirect to path
 */

export {};
