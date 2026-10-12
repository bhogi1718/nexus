import React from 'react';

const TONE = {
  primary: 'bg-primary text-content-on-primary',
  accent: 'bg-accent text-content',
  neutral: 'bg-surface-sunken text-content-secondary',
  success: 'bg-success text-white',
  danger: 'bg-danger text-white',
};

export const Badge = ({ count, max = 99, tone = 'primary', className = '' }) => {
  if (!count || count <= 0) return null;

  return (
    <span
      className={`flex-shrink-0 min-w-[22px] h-[22px] px-1.5 text-[11px] font-semibold rounded-full
        flex items-center justify-center tabular-nums ${TONE[tone]} ${className}`}
      aria-label={`${count} unread`}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
};

export const Pill = ({ children, tone = 'neutral', icon, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium ${TONE[tone]} ${className}`}>
    {icon}
    {children}
  </span>
);
