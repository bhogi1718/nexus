import { decryptMessage, getKeys } from '../services/cryptoService';

const looksEncrypted = (content) =>
  typeof content === 'string' && content.length >= 50 && /^[A-Za-z0-9+/]+=*$/.test(content);

export const decryptMessageIfNeeded = (message, conversation, user) => {
  try {
    if (!conversation || conversation.type !== 'private' || conversation.participants?.length !== 2) {
      return message;
    }
    if (!message?.content || message.fileUrl) {
      return message;
    }

    const keys = getKeys();
    const otherParticipant = conversation.participants.find(
      p => String(p._id) !== String(user?.id)
    );

    // Without keys we can't decrypt, but ciphertext must still never be shown as
    // if it were the message.
    if (!keys?.secretKey || !otherParticipant?.publicKey) {
      return looksEncrypted(message.content) ? { ...message, undecryptable: true } : message;
    }

    try {
      const decrypted = decryptMessage(message.content, otherParticipant.publicKey, keys.secretKey);
      return { ...message, content: decrypted, isDecrypted: true };
    } catch {
      return { ...message, undecryptable: looksEncrypted(message.content) };
    }
  } catch (err) {
    console.error('Decryption error:', err);
    return message;
  }
};
