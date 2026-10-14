import React, { useEffect, useState } from 'react';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { SettingGroup } from '../ui/SettingGroup';
import { Skeleton } from '../ui/Skeleton';
import { syncPeerIdentity, safetyNumber, acceptNewIdentity } from '../../crypto/sessionManager';

/**
 * Safety number and key-change warning for one contact. Comparing the number
 * with theirs (in person or on a call) proves no one is intercepting the chat.
 */
export const EncryptionSection = ({ userId, identityKeyDh, name }) => {
  const toast = useToast();
  const [groups, setGroups] = useState(null);
  const [changed, setChanged] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!identityKeyDh) return undefined;
    let cancelled = false;
    setGroups(null);
    setFailed(false);
    (async () => {
      try {
        const sync = await syncPeerIdentity(String(userId), identityKeyDh);
        const digits = await safetyNumber(identityKeyDh);
        if (cancelled) return;
        setChanged(sync.changed);
        setGroups(digits);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, identityKeyDh]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(groups.join(' '));
      toast.success('Safety number copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const markVerified = async () => {
    await acceptNewIdentity(String(userId));
    setChanged(false);
    toast.success(`${name}'s new key is now trusted`);
  };

  if (!identityKeyDh) {
    return (
      <SettingGroup title="Encryption">
        <Row icon="lock_open" text={`${name} hasn't signed in since end-to-end encryption arrived. You can message them once they do.`} />
      </SettingGroup>
    );
  }

  return (
    <SettingGroup
      title="Encryption"
      description="Text messages in this chat are end-to-end encrypted. Only you and this person can read them, not even Nexus."
    >
      {changed && (
        <div className="px-md py-3.5 bg-warning-subtle flex gap-sm" role="alert">
          <Icon name="warning" className="text-[20px] text-warning flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-body-md font-semibold text-content">{name}'s security code changed</p>
            <p className="text-body-sm text-content-secondary mt-0.5 text-pretty">
              This usually means they signed in on a new device. Compare the number below with theirs
              before sharing anything sensitive.
            </p>
            <Button size="sm" className="mt-sm" onClick={markVerified}>Mark as verified</Button>
          </div>
        </div>
      )}

      <div className="px-md py-md">
        <p className="text-body-sm text-content-secondary">Safety number</p>
        {failed ? (
          <p className="mt-xs text-body-sm text-danger">Could not compute the safety number on this device.</p>
        ) : !groups ? (
          <div className="mt-sm grid grid-cols-4 gap-xs" aria-busy="true">
            {Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-5" />)}
          </div>
        ) : (
          <>
            <div
              className="mt-sm grid grid-cols-4 gap-x-sm gap-y-xs font-mono text-body-md tabular-nums text-content tracking-wide"
              aria-label={`Safety number ${groups.join(' ')}`}
            >
              {groups.map((g, i) => <span key={i}>{g}</span>)}
            </div>
            <div className="mt-sm flex items-center justify-between gap-sm">
              <p className="text-caption text-content-muted text-pretty">
                If {name} sees the same number, your chat is secure.
              </p>
              <Button size="sm" variant="ghost" onClick={copy}>Copy</Button>
            </div>
          </>
        )}
      </div>
    </SettingGroup>
  );
};

const Row = ({ icon, text }) => (
  <div className="px-md py-3.5 flex gap-sm items-start">
    <Icon name={icon} className="text-[20px] text-content-muted flex-shrink-0" />
    <p className="text-body-md text-content-secondary text-pretty">{text}</p>
  </div>
);
