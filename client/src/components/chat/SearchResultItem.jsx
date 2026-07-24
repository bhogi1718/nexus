import React from 'react';

export const SearchResultItem = ({ user, onClick }) => (
  <button
    onClick={onClick}
    className="w-full p-4 text-left hover:bg-card border-b border-border transition-colors"
  >
    <p className="font-semibold text-text-primary text-sm">{user.name}</p>
    <p className="text-xs text-text-muted">{user.email}</p>
  </button>
);
