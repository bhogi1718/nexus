import React from 'react';

export const SearchResultItem = ({ user, onClick }) => (
  <button
    onClick={onClick}
    className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors"
  >
    <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
    <p className="text-xs text-gray-500">{user.email}</p>
  </button>
);
