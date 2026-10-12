import React, { useEffect, useState } from 'react';
import chatAPI from '../../services/chatService';
import { useToast } from '../ui/Toast';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { SettingGroup, SettingRow } from '../ui/SettingGroup';
import { Skeleton } from '../ui/Skeleton';
import { TextField } from '../ui/TextField';
import { formatMonthYear, presenceLabel } from '../../utils/time';

/**
 * Another person's profile ("Contact info" in WhatsApp). Opened from the chat
 * header or the contacts list.
 *
 * `livePresence` is the participant object from the conversation list, which is
 * kept current by socket events; the fetched profile is only a snapshot.
 */
export const ContactInfoPanel = ({
  userId,
  livePresence,
  onClose,
  onMessage,
  onAddContact,
  onRemoveContact,
  onSetNickname,
  onDeleteChat,
  isOpenChat = false,
}) => {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'remove' | 'delete'

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError('');
    chatAPI.getUserProfile(userId)
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data.user);
        setNickname(data.user.nickname || '');
      })
      .catch(err => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load this profile');
      });
    return () => { cancelled = true; };
  }, [userId]);

  const person = profile ? { ...profile, ...(livePresence && {
    isOnline: livePresence.isOnline,
    lastSeen: livePresence.lastSeen ?? profile.lastSeen,
  }) } : null;
  const shownName = person?.nickname || person?.name;
  const presence = presenceLabel(person);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const saveNickname = async () => {
    setBusy(true);
    const ok = await onSetNickname?.(userId, nickname.trim());
    setBusy(false);
    if (ok) {
      setProfile(p => ({ ...p, nickname: nickname.trim() || null }));
      setEditingNickname(false);
      toast.success(nickname.trim() ? 'Nickname saved' : 'Nickname removed');
    }
  };

  const addContact = async () => {
    setBusy(true);
    const ok = await onAddContact?.(profile);
    setBusy(false);
    if (ok !== false) setProfile(p => ({ ...p, isContact: true }));
  };

  const removeContact = async () => {
    setConfirm(null);
    const ok = await onRemoveContact?.(userId);
    if (ok !== false) {
      setProfile(p => ({ ...p, isContact: false, nickname: null }));
      toast.success(`${profile.name} removed from contacts`);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg animate-fade-in">
      <header className="h-16 px-sm flex items-center gap-xs border-b border-border bg-surface/90 backdrop-blur-md flex-shrink-0">
        <IconButton label="Close contact info" onClick={onClose}>
          <Icon name="close" className="text-[22px]" />
        </IconButton>
        <h2 className="font-sans text-title-md">Contact info</h2>
      </header>

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="p-xl text-center">
            <Icon name="person_off" className="text-[40px] text-content-muted" />
            <p className="mt-sm text-body-md text-content-secondary">{error}</p>
          </div>
        ) : !person ? (
          <div className="flex flex-col items-center p-xl gap-sm" aria-busy="true">
            <Skeleton className="w-28 h-28 rounded-full" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        ) : (
          <>
            <section className="bg-surface border-b border-border px-md pt-xl pb-lg flex flex-col items-center text-center">
              <Avatar name={person.name} src={person.avatar} size="2xl" showStatus isOnline={person.isOnline} />
              <h3 className="mt-md text-display-md font-display text-balance">{shownName}</h3>
              {person.nickname && (
                <p className="text-body-sm text-content-muted">~ {person.name}</p>
              )}
              <p className="mt-0.5 text-body-md text-content-secondary">{person.email}</p>
              {presence && (
                <p className={`mt-1 text-caption ${person.isOnline ? 'text-success font-semibold' : 'text-content-muted'}`}>
                  {presence}
                </p>
              )}

              <div className="mt-lg flex gap-sm">
                {!isOpenChat && onMessage && (person.isContact || person.conversationId) && (
                  <ActionTile icon="chat_bubble" label="Message" onClick={() => onMessage(userId)} />
                )}
                <ActionTile icon="alternate_email" label="Copy email" onClick={() => copy(person.email, 'Email')} />
              </div>
            </section>

            <div className="max-w-xl mx-auto px-md py-lg">
              <SettingGroup title="About">
                <div className="px-md py-3.5">
                  <p className="text-body-md text-content text-pretty break-words">
                    {person.status || <span className="text-content-muted italic">No about yet</span>}
                  </p>
                </div>
              </SettingGroup>

              <SettingGroup title="Contact info">
                <SettingRow
                  icon="mail"
                  label="Email"
                  description={person.email}
                  action={(
                    <IconButton label="Copy email address" size="sm" onClick={() => copy(person.email, 'Email')}>
                      <Icon name="content_copy" className="text-[18px]" />
                    </IconButton>
                  )}
                />
                {formatMonthYear(person.memberSince) && (
                  <SettingRow icon="calendar_month" label="On Nexus since" value={formatMonthYear(person.memberSince)} />
                )}
                {person.isContact && !editingNickname && (
                  <SettingRow
                    icon="badge"
                    label="Nickname"
                    description="Only you can see this"
                    value={person.nickname || 'Add'}
                    onClick={() => setEditingNickname(true)}
                    chevron
                  />
                )}
                {editingNickname && (
                  <div className="p-md space-y-sm">
                    <TextField
                      label="Nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder={person.name}
                      maxLength={50}
                      hint="Shown instead of their name, only to you. Leave empty to remove."
                      autoFocus
                    />
                    <div className="flex justify-end gap-sm">
                      <Button variant="ghost" onClick={() => { setEditingNickname(false); setNickname(person.nickname || ''); }} disabled={busy}>
                        Cancel
                      </Button>
                      <Button onClick={saveNickname} loading={busy}>Save</Button>
                    </div>
                  </div>
                )}
              </SettingGroup>

              <SettingGroup title="Privacy">
                <SettingRow
                  icon="lock"
                  label="Encryption"
                  description="Messages in this chat are encrypted on your device before they are sent."
                />
              </SettingGroup>

              <SettingGroup>
                {person.isContact ? (
                  <SettingRow icon="person_remove" label={`Remove ${shownName}`} danger onClick={() => setConfirm('remove')} />
                ) : onAddContact ? (
                  <SettingRow icon="person_add" label="Add to contacts" onClick={addContact} />
                ) : null}
                {onDeleteChat && person.conversationId && (
                  <SettingRow icon="delete" label="Delete chat" danger onClick={() => setConfirm('delete')} />
                )}
              </SettingGroup>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirm === 'remove'}
        onClose={() => setConfirm(null)}
        onConfirm={removeContact}
        title={`Remove ${shownName}?`}
        message="They'll be removed from your contacts. Your chat history with them stays until you delete it."
        confirmLabel="Remove"
        danger
      />
      <ConfirmDialog
        isOpen={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => { setConfirm(null); onDeleteChat(person.conversationId); onClose(); }}
        title="Delete this chat?"
        message="This removes the chat and its messages for you only. If they message you again, the chat will reappear."
        confirmLabel="Delete chat"
        danger
      />
    </div>
  );
};

const ActionTile = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-24 flex flex-col items-center gap-1 py-sm rounded-xl border border-border bg-surface
      text-primary transition-all duration-fast hover:bg-surface-sunken hover:border-border-strong active:scale-95"
  >
    <Icon name={icon} className="text-[22px]" />
    <span className="text-caption font-semibold text-content">{label}</span>
  </button>
);
