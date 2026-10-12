import { isUserOnline } from './socketRegistry.js';

// Settings default to on: users created before settings existed have no field.
export const receiptsEnabled = (user) => user?.settings?.readReceipts !== false;
export const lastSeenEnabled = (user) => user?.settings?.showLastSeen !== false;

/**
 * Read receipts are reciprocal, as in WhatsApp: a reader who turned them off is
 * never reported as having read anything, and a viewer who turned them off
 * doesn't see anyone else's. The viewer's own entries are always kept.
 */
export const visibleReadBy = (readBy, viewerId, usersById) => {
  const viewerOptedOut = !receiptsEnabled(usersById.get(String(viewerId)));
  return (readBy || []).filter(entry => {
    const readerId = String(entry.user);
    if (readerId === String(viewerId)) return true;
    if (viewerOptedOut) return false;
    return receiptsEnabled(usersById.get(readerId));
  });
};

/** Online status and last seen, hidden in both directions when either side opts out. */
export const visiblePresence = (target, viewer) => {
  if (!target) return { isOnline: false, lastSeen: null };
  const isSelf = viewer && String(target.userId) === String(viewer.userId);
  if (!isSelf && (!lastSeenEnabled(target) || !lastSeenEnabled(viewer))) {
    return { isOnline: false, lastSeen: null };
  }
  const online = isUserOnline(target.userId);
  return { isOnline: online, lastSeen: online ? null : (target.lastSeen || null) };
};
