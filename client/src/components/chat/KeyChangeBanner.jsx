import React, { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { syncPeerIdentity, acceptNewIdentity } from '../../crypto/sessionManager';

/**
 * Shown above the messages when a contact's encryption key changed (usually a new
 * device, possibly an impersonator). The check runs as soon as the chat opens, not
 * only when the info panel is viewed, so a change can't go unnoticed.
 */
export const KeyChangeBanner = ({ peer, name, onVerify }) => {
  const [changed, setChanged] = useState(false);
  const peerId = peer?._id ? String(peer._id) : null;
  const key = peer?.identityKeyDh || null;

  useEffect(() => {
    setChanged(false);
    if (!peerId || !key) return undefined;
    let cancelled = false;
    syncPeerIdentity(peerId, key)
      .then(({ changed: c }) => { if (!cancelled) setChanged(c); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [peerId, key]);

  if (!changed) return null;

  const trust = async () => {
    await acceptNewIdentity(peerId);
    setChanged(false);
  };

  return (
    <div className="px-md py-sm bg-warning-subtle flex items-start gap-sm border-b border-border" role="alert">
      <Icon name="warning" className="text-[20px] text-warning flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-body-md font-semibold text-content">{name}'s security code changed</p>
        <p className="text-body-sm text-content-secondary text-pretty">
          They may have signed in on a new device. Compare safety numbers before sharing anything sensitive.
        </p>
        <div className="mt-xs flex gap-xs">
          {onVerify && <Button size="sm" variant="ghost" onClick={() => onVerify(peerId)}>Compare numbers</Button>}
          <Button size="sm" onClick={trust}>Trust new key</Button>
        </div>
      </div>
    </div>
  );
};
