import React from 'react';

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
};

const STATUS_DOT_SIZE = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

export const Avatar = ({ name, size = 'md', showStatus = false, isOnline = false, className = '' }) => {
  const initial = name?.charAt(0).toUpperCase() || '?';

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${SIZE_CLASSES[size]} bg-primary-container rounded-full flex items-center justify-center text-on-primary-container font-bold ring-2 ring-primary`}
      >
        {initial}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${STATUS_DOT_SIZE[size]} rounded-full ring-2 ring-surface-container ${
            isOnline ? 'bg-primary' : 'bg-outline'
          }`}
        />
      )}
    </div>
  );
};
