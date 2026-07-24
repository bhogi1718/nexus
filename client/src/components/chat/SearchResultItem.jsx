import React from 'react';

export const SearchResultItem = ({ user, onClick }) => (
  <button
    onClick={onClick}
    className="w-full p-4 text-left hover:bg-surface-container-high border-b border-outline-variant transition-colors"
  >
    <p className="font-semibold text-on-surface text-sm">{user.name}</p>
    <p className="text-xs text-on-surface-variant">{user.email}</p>
  </button>
);
