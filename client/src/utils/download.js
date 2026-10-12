import chatAPI from '../services/chatService';

/**
 * Saves an attachment with its real file name. Goes through the server's
 * download endpoint (which checks the user is in the conversation) because the
 * browser ignores the `download` attribute on links to another domain and would
 * just open the file in a new tab.
 */
export const downloadAttachment = async ({ messageId, url, fileName }) => {
  if (messageId && !String(messageId).startsWith('temp-')) {
    const response = await chatAPI.downloadFile(messageId);
    const href = URL.createObjectURL(response.data);
    try {
      const a = document.createElement('a');
      a.href = href;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }
    return;
  }
  // Not saved on the server yet: best effort.
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const EXTENSION_KIND = [
  [/\.(jpe?g|png|gif|webp)$/i, 'image'],
  [/\.(mp4|webm|mov)$/i, 'video'],
  [/\.(mp3|wav|ogg)$/i, 'audio'],
  [/\.pdf$/i, 'pdf'],
];

/** Prefers the type the server recorded; falls back to the file name. */
export const attachmentKind = ({ type, fileName, fileUrl }) => {
  if (type === 'image' || type === 'video') return type;
  if (type === 'voice') return 'audio';
  const name = (fileName || fileUrl || '').split('?')[0];
  return EXTENSION_KIND.find(([re]) => re.test(name))?.[1] || 'file';
};
