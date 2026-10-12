import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useToast } from '../ui/Toast';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { SettingGroup, SettingRow } from '../ui/SettingGroup';
import { TextField } from '../ui/TextField';
import { Toggle } from '../ui/Toggle';

const APP_VERSION = '1.1.0';
const DEFAULT_ABOUT = "Hey there! I'm using Nexus";
const ABOUT_PRESETS = [
  DEFAULT_ABOUT,
  'Available',
  'Busy',
  'At work',
  'At school',
  'In a meeting',
  'Battery about to die',
  "Can't talk, messages only",
  'Sleeping',
  'Urgent calls only',
];

const TITLES = {
  profile: 'Profile',
  privacy: 'Privacy',
  chats: 'Chats',
  notifications: 'Notifications',
  help: 'Help',
};

/** WhatsApp-style settings: a main list that drills into focused pages. */
export const SettingsPanel = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [page, setPage] = useState('main');
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const back = page === 'main' ? onClose : () => setPage('main');

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg">
      <header className="h-16 px-sm flex items-center gap-xs border-b border-border bg-surface/90 backdrop-blur-md flex-shrink-0">
        {back && (
          <IconButton label={page === 'main' ? 'Close settings' : 'Back to settings'} onClick={back}>
            <Icon name={page === 'main' ? 'close' : 'arrow_back'} className="text-[22px]" />
          </IconButton>
        )}
        <h2 className={`font-sans text-title-md ${back ? '' : 'pl-sm'}`}>{TITLES[page] || 'Settings'}</h2>
      </header>

      <div key={page} className="flex-1 overflow-y-auto animate-fade-in">
        <div className="max-w-xl mx-auto px-md py-lg">
          {page === 'main' && (
            <>
              <button
                type="button"
                onClick={() => setPage('profile')}
                className="w-full mb-lg flex items-center gap-md p-md bg-surface border border-border rounded-xl shadow-xs text-left
                  transition-colors duration-fast hover:bg-surface-sunken"
              >
                <Avatar name={user?.name} src={user?.avatar} size="lg" />
                <span className="flex-1 min-w-0">
                  <span className="block text-title-lg font-display truncate">{user?.name}</span>
                  <span className="block text-body-sm text-content-muted truncate">{user?.status || DEFAULT_ABOUT}</span>
                </span>
                <Icon name="chevron_right" className="text-[22px] text-content-muted" />
              </button>

              <SettingGroup>
                <SettingRow icon="lock" label="Privacy" description="Last seen, read receipts" onClick={() => setPage('privacy')} chevron />
                <SettingRow icon="chat" label="Chats" description="Theme, enter to send" onClick={() => setPage('chats')} chevron />
                <SettingRow icon="notifications" label="Notifications" description="Desktop alerts and previews" onClick={() => setPage('notifications')} chevron />
                <SettingRow icon="help" label="Help" description="About Nexus, version" onClick={() => setPage('help')} chevron />
              </SettingGroup>

              <SettingGroup>
                <SettingRow icon="logout" label="Log out" danger onClick={() => setConfirmSignOut(true)} />
              </SettingGroup>
            </>
          )}

          {page === 'profile' && <ProfilePage />}
          {page === 'privacy' && <PrivacyPage />}
          {page === 'chats' && <ChatsPage />}
          {page === 'notifications' && <NotificationsPage />}
          {page === 'help' && <HelpPage />}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={logout}
        title="Log out of Nexus?"
        message="Your encryption keys will be cleared from this device. You'll need a new sign-in code to get back in."
        confirmLabel="Log out"
        danger
      />
    </div>
  );
};

// --- pages -------------------------------------------------------------------

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // 'name' | 'about'
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const start = (field) => {
    setEditing(field);
    setError('');
    setValue(field === 'name' ? user?.name || '' : user?.status || '');
  };

  const save = async (field, nextValue) => {
    const trimmed = nextValue.trim();
    if (field === 'name' && (trimmed.length < 2 || trimmed.length > 50)) {
      setError('Name must be between 2 and 50 characters');
      return;
    }
    if (field === 'about' && trimmed.length > 140) {
      setError('About must be 140 characters or fewer');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await authAPI.updateProfile(field === 'name' ? { name: trimmed } : { status: trimmed });
      updateUser(data.user);
      setEditing(null);
      toast.success(field === 'name' ? 'Name updated' : 'About updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center mb-lg">
        <div className="relative">
          <Avatar name={user?.name} src={user?.avatar} size="2xl" />
          <button
            type="button"
            onClick={() => toast.notify('Profile photos are coming soon.')}
            aria-label="Change profile photo"
            className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-content-on-primary shadow-md flex items-center justify-center
              transition-transform duration-fast hover:scale-105 active:scale-95"
          >
            <Icon name="photo_camera" className="text-[20px]" />
          </button>
        </div>
      </div>

      <SettingGroup title="Name" description="This is the name your contacts will see.">
        {editing === 'name' ? (
          <InlineEditor
            value={value}
            onChange={setValue}
            onCancel={() => setEditing(null)}
            onSave={() => save('name', value)}
            saving={saving}
            error={error}
            maxLength={50}
            label="Your name"
          />
        ) : (
          <SettingRow icon="person" label={user?.name} onClick={() => start('name')} action={<Icon name="edit" className="text-[18px] text-content-muted" />} />
        )}
      </SettingGroup>

      <SettingGroup title="About">
        {editing === 'about' ? (
          <InlineEditor
            value={value}
            onChange={setValue}
            onCancel={() => setEditing(null)}
            onSave={() => save('about', value)}
            saving={saving}
            error={error}
            maxLength={140}
            label="About"
            hint={`${value.length}/140`}
          />
        ) : (
          <SettingRow
            icon="info"
            label={user?.status || DEFAULT_ABOUT}
            onClick={() => start('about')}
            action={<Icon name="edit" className="text-[18px] text-content-muted" />}
          />
        )}
      </SettingGroup>

      <SettingGroup title="Select About">
        {ABOUT_PRESETS.map(preset => {
          const current = (user?.status || DEFAULT_ABOUT) === preset;
          return (
            <SettingRow
              key={preset}
              label={preset}
              onClick={current || saving ? undefined : () => save('about', preset)}
              action={current ? <Icon name="check" className="text-[20px] text-primary" /> : null}
            />
          );
        })}
      </SettingGroup>

      <SettingGroup title="Email" description="Your contacts add you using this address.">
        <SettingRow icon="mail" label={user?.email} />
      </SettingGroup>
    </>
  );
};

const PrivacyPage = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState(null);
  const settings = user?.settings || { readReceipts: true, showLastSeen: true };

  const update = async (key, value) => {
    setPending(key);
    updateUser({ settings: { ...settings, [key]: value } });
    try {
      const { data } = await authAPI.updateSettings({ [key]: value });
      updateUser(data.user);
    } catch (err) {
      updateUser({ settings });
      toast.error(err.response?.data?.message || 'Could not update this setting');
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <SettingGroup
        title="Who can see my personal info"
        description="If you don't share your last seen and online status, you won't be able to see other people's either."
      >
        <SettingRow
          icon="schedule"
          label="Last seen and online"
          description={settings.showLastSeen ? 'Your contacts' : 'Nobody'}
          action={<Toggle checked={settings.showLastSeen} onChange={v => update('showLastSeen', v)} disabled={pending === 'showLastSeen'} label="Share last seen and online" />}
        />
      </SettingGroup>

      <SettingGroup description="If turned off, you won't send or receive read receipts (blue ticks). Delivery ticks are always shown.">
        <SettingRow
          icon="done_all"
          label="Read receipts"
          action={<Toggle checked={settings.readReceipts} onChange={v => update('readReceipts', v)} disabled={pending === 'readReceipts'} label="Read receipts" />}
        />
      </SettingGroup>

      <SettingGroup title="Who can reach me">
        <SettingRow icon="group" label="Messages" description="Only people you have added as contacts can start a chat with you." />
      </SettingGroup>
    </>
  );
};

const ChatsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { prefs, setPreference } = usePreferences();

  return (
    <>
      <SettingGroup title="Display">
        <SettingRow
          icon={theme === 'dark' ? 'dark_mode' : 'light_mode'}
          label="Dark theme"
          description={theme === 'dark' ? 'On' : 'Off'}
          action={<Toggle checked={theme === 'dark'} onChange={toggleTheme} label="Dark theme" />}
        />
      </SettingGroup>

      <SettingGroup title="Chat settings">
        <SettingRow
          icon="keyboard_return"
          label="Enter is send"
          description={prefs.enterToSend ? 'Enter sends, Shift+Enter adds a new line' : 'Enter adds a new line, Ctrl+Enter sends'}
          action={<Toggle checked={prefs.enterToSend} onChange={v => setPreference('enterToSend', v)} label="Enter is send" />}
        />
      </SettingGroup>
    </>
  );
};

const NotificationsPage = () => {
  const { prefs, setPreference } = usePreferences();
  const toast = useToast();
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const blocked = supported && Notification.permission === 'denied';

  const toggleNotifications = async (enabled) => {
    if (!enabled) {
      setPreference('notifications', false);
      return;
    }
    if (!supported) {
      toast.error('This browser does not support desktop notifications.');
      return;
    }
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permission === 'granted') {
      setPreference('notifications', true);
      toast.success('Notifications turned on');
    } else {
      toast.error('Notifications are blocked. Allow them in your browser’s site settings.');
    }
  };

  return (
    <>
      <SettingGroup
        title="Messages"
        description={blocked
          ? 'Your browser is blocking notifications for this site. Allow them in the browser’s site settings, then turn this on.'
          : 'Shown when a message arrives while Nexus is in the background.'}
      >
        <SettingRow
          icon="notifications"
          label="Desktop notifications"
          action={<Toggle checked={prefs.notifications && !blocked} onChange={toggleNotifications} disabled={!supported} label="Desktop notifications" />}
        />
        <SettingRow
          icon="visibility"
          label="Show preview"
          description="Include the message text in notifications"
          action={<Toggle checked={prefs.notificationPreview} onChange={v => setPreference('notificationPreview', v)} disabled={!prefs.notifications} label="Show message preview" />}
        />
      </SettingGroup>
    </>
  );
};

const HelpPage = () => (
  <>
    <div className="flex flex-col items-center text-center mb-lg">
      <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-surface-inverse flex items-center justify-center shadow-md">
        <span className="font-display text-content-inverse text-3xl leading-none pb-1">N</span>
      </span>
      <h3 className="mt-md text-title-lg font-display">Nexus</h3>
      <p className="text-body-sm text-content-muted">Version {APP_VERSION}</p>
    </div>
    <SettingGroup>
      <SettingRow icon="lock" label="Encryption" description="Text messages are encrypted on your device before they are sent." />
      <SettingRow icon="done_all" label="Ticks" description="One tick: sent. Two ticks: delivered. Blue ticks: read." />
      <SettingRow icon="info" label="Version" value={APP_VERSION} />
    </SettingGroup>
  </>
);

// --- shared ------------------------------------------------------------------

const InlineEditor = ({ value, onChange, onCancel, onSave, saving, error, maxLength, label, hint }) => (
  <form
    className="p-md space-y-sm"
    onSubmit={(e) => { e.preventDefault(); onSave(); }}
  >
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      error={error}
      hint={hint}
      autoFocus
    />
    <div className="flex justify-end gap-sm">
      <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
      <Button type="submit" loading={saving}>Save</Button>
    </div>
  </form>
);
