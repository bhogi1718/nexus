import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../ui/Toast';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { SettingGroup, SettingRow } from '../ui/SettingGroup';
import { TextField } from '../ui/TextField';
import { Toggle } from '../ui/Toggle';

const APP_VERSION = '1.0.0';

export const ProfilePanel = ({ user, onClose }) => {
  const { logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [status, setStatus] = useState(user?.status || '');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const startEditing = () => {
    setName(user?.name || '');
    setStatus(user?.status || '');
    setFieldError('');
    setEditing(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setFieldError('Name must be between 2 and 50 characters');
      return;
    }

    setSaving(true);
    setFieldError('');
    try {
      const { data } = await authAPI.updateProfile({ name: trimmed, status: status.trim() });
      updateUser(data.user);
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not save your changes';
      setFieldError(message);
    } finally {
      setSaving(false);
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user?.email || '');
      toast.success('Email copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      {/* Header band */}
      <div className="relative bg-surface-inverse text-content-inverse">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{ background: 'radial-gradient(28rem 14rem at 50% -20%, rgb(212 154 174 / 0.5), transparent 70%)' }}
        />

        {onClose && (
          <div className="relative flex justify-end p-2">
            <IconButton label="Close profile" variant="inverse" onClick={onClose}>
              <Icon name="close" className="text-[22px]" />
            </IconButton>
          </div>
        )}

        <div className={`relative px-md pb-xl flex flex-col items-center text-center ${onClose ? '' : 'pt-xl'}`}>
          <div className="relative">
            <Avatar name={user?.name} src={user?.avatar} size="2xl" />
            <button
              type="button"
              onClick={() => toast.notify('Profile photos are coming soon.')}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-surface text-content border border-border shadow-md flex items-center justify-center transition-transform duration-fast hover:scale-105 active:scale-95"
            >
              <Icon name="photo_camera" className="text-[18px]" />
            </button>
          </div>

          <h2 className="mt-md text-display-md font-display">{user?.name}</h2>
          <p className="text-body-md text-content-inverse/70 mt-0.5">{user?.email}</p>
          {user?.status && (
            <p className="mt-sm text-body-md text-content-inverse/85 max-w-sm text-pretty">{user.status}</p>
          )}

          <Button variant="secondary" size="sm" icon="edit" className="mt-md" onClick={startEditing}>
            Edit profile
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-xl mx-auto px-md py-lg">
        {editing && (
          <SettingGroup title="Edit profile">
            <div className="p-md space-y-md">
              <TextField
                label="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldError}
                maxLength={50}
                autoFocus
              />
              <TextField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                hint={`${status.length}/140 — shown to your contacts`}
                maxLength={140}
              />
              <div className="flex gap-sm justify-end pt-xs">
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} loading={saving}>Save changes</Button>
              </div>
            </div>
          </SettingGroup>
        )}

        <SettingGroup title="Account">
          <SettingRow
            icon="mail"
            label="Email"
            description={user?.email}
            action={
              <IconButton label="Copy email address" size="sm" onClick={copyEmail}>
                <Icon name="content_copy" className="text-[18px]" />
              </IconButton>
            }
          />
          <SettingRow
            icon="badge"
            label="Display name"
            value={user?.name}
            onClick={startEditing}
            chevron
          />
        </SettingGroup>

        <SettingGroup
          title="Privacy & security"
          description="Messages are encrypted on your device before being sent."
        >
          <SettingRow
            icon="lock"
            label="Message encryption"
            description="Active for one-to-one conversations"
            action={
              <span className="flex items-center gap-1 text-caption font-semibold text-success">
                <Icon name="check_circle" className="text-[16px]" />
                On
              </span>
            }
          />
          <SettingRow
            icon="person_check"
            label="Who can reach you"
            description="Only people you have added as contacts"
          />
        </SettingGroup>

        <SettingGroup title="Appearance">
          <SettingRow
            icon={theme === 'dark' ? 'dark_mode' : 'light_mode'}
            label="Dark theme"
            description={theme === 'dark' ? 'Currently on' : 'Currently off'}
            action={<Toggle checked={theme === 'dark'} onChange={toggleTheme} label="Toggle dark theme" />}
          />
        </SettingGroup>

        <SettingGroup title="About">
          <SettingRow icon="info" label="Version" value={APP_VERSION} />
        </SettingGroup>

        <SettingGroup>
          <SettingRow
            icon="logout"
            label="Sign out"
            description="You will need a new code to sign back in"
            danger
            onClick={() => setConfirmSignOut(true)}
          />
        </SettingGroup>
      </div>

      <ConfirmDialog
        isOpen={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={logout}
        title="Sign out of Nexus?"
        message="Your encryption keys will be cleared from this device. You'll need a new sign-in code to get back in."
        confirmLabel="Sign out"
        danger
      />
    </div>
  );
};
