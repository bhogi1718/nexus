import { useCallback, useEffect, useRef, useState } from 'react';
import { isSealed, isOpened, openSealed } from '../utils/attachments';

/**
 * The URL to show an attachment from. Unencrypted files use their stored URL
 * directly; sealed ones are downloaded and decrypted on this device first —
 * straight away when `auto` is set, otherwise when `load` is called.
 * `status` is 'idle' | 'loading' | 'ready' | 'error'.
 */
export const useAttachment = (message, { auto = false } = {}) => {
  const sealed = isSealed(message);
  const [state, setState] = useState(() => (sealed
    ? { url: null, status: 'idle' }
    : { url: message.fileUrl, status: 'ready' }));
  const current = useRef(message.fileUrl);
  current.current = message.fileUrl;

  const load = useCallback(async () => {
    if (!sealed) return message.fileUrl;
    const fileUrl = message.fileUrl;
    setState(prev => (prev.status === 'ready' ? prev : { url: null, status: 'loading' }));
    try {
      const url = await openSealed(message);
      if (current.current === fileUrl) setState({ url, status: 'ready' });
      return url;
    } catch {
      if (current.current === fileUrl) setState({ url: null, status: 'error' });
      return null;
    }
    // The key and location identify the file; other message fields don't matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealed, message.fileUrl, message.fileKey]);

  useEffect(() => {
    if (!sealed) {
      setState({ url: message.fileUrl, status: 'ready' });
      return;
    }
    if (auto || isOpened(message.fileUrl)) load();
  }, [sealed, auto, message.fileUrl, load]);

  return { ...state, sealed, load };
};
