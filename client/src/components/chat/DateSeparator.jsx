import React from 'react';

export const DateSeparator = ({ label }) => (
  <div className="flex items-center gap-sm my-md" role="separator" aria-label={label}>
    <span className="flex-1 h-px bg-border" />
    <span className="text-label-caps uppercase text-content-muted">{label}</span>
    <span className="flex-1 h-px bg-border" />
  </div>
);
