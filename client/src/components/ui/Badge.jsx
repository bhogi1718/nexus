import React from 'react';

export const Badge = ({ count, max = 99 }) => {
  if (!count || count <= 0) return null;

  return (
    <span className="flex-shrink-0 min-w-[24px] h-6 px-1.5 bg-primary-container text-on-primary-container text-xs font-bold rounded-full flex items-center justify-center">
      {count > max ? `${max}+` : count}
    </span>
  );
};
