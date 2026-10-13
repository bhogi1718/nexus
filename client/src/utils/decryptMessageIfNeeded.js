import { decryptFrom, cachedPlaintext } from '../crypto/sessionManager';
import { looksLikeEnvelope } from '../crypto/envelope';

// Ciphertext from the encryption scheme used before this one. Its keys are gone,
// so it can only ever be shown as "encrypted".
const looksLikeLegacyCiphertext = (content) =>
  typeof content === 'string' && content.length >= 50 && /^[A-Za-z0-9+/]+=*$/.test(content);

const senderId = (message) => String(message.sender?._id ?? message.sender ?? '');

/**
 * Turns an encrypted message into its text. Our own messages come from the local
 * cache (their keys are destroyed once used); everyone else's go through their
 * session. Anything this device can't open is marked `undecryptable`, never shown raw.
 */
export const decryptMessageIfNeeded = async (message, conversation, user) => {
  const content = message?.content;
  if (typeof content !== 'string' || !content) return message;
  if (!conversation || conversation.type !== 'private') return message;

  if (!looksLikeEnvelope(content)) {
    return looksLikeLegacyCiphertext(content) ? { ...message, undecryptable: true } : message;
  }

  try {
    const fromMe = senderId(message) === String(user?.id);
    const text = fromMe
      ? await cachedPlaintext(content)
      : await decryptFrom(senderId(message), content);
    if (text === undefined) return { ...message, undecryptable: true };
    return { ...message, content: text, isDecrypted: true };
  } catch {
    return { ...message, undecryptable: true };
  }
};

/** Decrypts a page of messages oldest-first, so each peer's ratchet advances in order. */
export const decryptMessages = async (messages, conversation, user) => {
  const ordered = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const results = new Map();
  await Promise.all(ordered.map(async (m) => {
    results.set(m, await decryptMessageIfNeeded(m, conversation, user));
  }));
  return messages.map(m => results.get(m));
};
