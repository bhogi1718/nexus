import React from 'react';

// Material Symbols Outlined wrapper — replaces individual lucide-react imports
// with the icon-font approach used throughout the Nexus Obsidian design.
export const Icon = ({ name, filled = false, className = '', style }) => (
  <span
    className={`material-symbols-outlined select-none ${className}`}
    style={{ fontVariationSettings: filled ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : undefined, ...style }}
    aria-hidden="true"
  >
    {name}
  </span>
);
