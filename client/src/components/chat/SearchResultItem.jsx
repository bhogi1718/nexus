import React from 'react';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';

export const SearchResultItem = ({ user, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-sm px-md py-3 min-h-[64px] text-left transition-colors duration-fast hover:bg-surface-sunken animate-row-in"
  >
    <Avatar name={user.name} src={user.avatar} size="md" />
    <span className="flex-1 min-w-0">
      <span className="block text-title-sm text-content truncate">{user.name}</span>
      <span className="block text-body-sm text-content-muted truncate">{user.email}</span>
    </span>
    <Icon name="arrow_forward" className="text-[18px] text-content-muted" />
  </button>
);
