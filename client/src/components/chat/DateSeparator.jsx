import React from 'react';

export const DateSeparator = ({ label }) => (
  <div className="flex items-center justify-center my-1">
    <span className="px-3 py-1 bg-card text-text-muted text-xs font-medium rounded-full">
      {label}
    </span>
  </div>
);
