import chatAPI from '../services/chatService';
import { openAttachment, SEALED_FILE_NAME } from '../crypto/attachment';

// Opened (decrypted) attachments as object URLs, keyed by where the sealed bytes
// live, so a file is downloaded and decrypted once per session however many
// times it is shown.
const opened = new Map();

// The type comes from the sender, so only types that can't run script in this
// origin are passed to the browser; anything else is saved as plain bytes.
const SAFE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/pdf', 'text/plain',
]);
const safeMime = (mime) => (SAFE_MIME_TYPES.has(mime) ? mime : 'application/octet-stream');

/** True for a message whose file is end-to-end encrypted and whose key we hold. */
export const isSealed = (message) => Boolean(message?.fileKey);

/** A sealed file this device has no key for (its message couldn't be decrypted). */
export const isSealedWithoutKey = (message) =>
  Boolean(message?.fileUrl) && !message.fileKey && message.fileName === SEALED_FILE_NAME;

export const isOpened = (fileUrl) => opened.has(fileUrl);

/** Registers a file the sender already holds, so it isn't downloaded back. */
export const rememberOpened = (fileUrl, blob) => {
  opened.set(fileUrl, Promise.resolve(URL.createObjectURL(blob)));
};

const fetchSealed = async ({ fileUrl, _id }) => {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Storage returned ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  } catch (err) {
    // Storage unreachable from the browser: go through the API instead.
    if (!_id || String(_id).startsWith('temp-')) throw err;
    const response = await chatAPI.downloadFile(_id);
    return new Uint8Array(await response.data.arrayBuffer());
  }
};

/** Downloads and decrypts a sealed attachment. Resolves to an object URL. */
export const openSealed = (message) => {
  const cached = opened.get(message.fileUrl);
  if (cached) return cached;
  const pending = (async () => {
    const bytes = openAttachment(await fetchSealed(message), message.fileKey);
    return URL.createObjectURL(new Blob([bytes], { type: safeMime(message.fileMime) }));
  })();
  opened.set(message.fileUrl, pending);
  // A failure isn't cached, so the next attempt retries.
  pending.catch(() => opened.delete(message.fileUrl));
  return pending;
};

/** Saves an object URL to disk under the file's real name. */
export const saveAs = (href, fileName) => {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
};
