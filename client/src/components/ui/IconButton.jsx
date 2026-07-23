import React from 'react';

const SIZE_CLASSES = {
  sm: 'min-w-[32px] min-h-[32px] p-1.5',
  md: 'min-w-[40px] min-h-[40px] p-2',
};

const VARIANT_CLASSES = {
  default: 'text-text-secondary hover:bg-card hover:text-text-primary',
  accent: 'text-accent hover:bg-accent/10',
  danger: 'text-red-500 hover:bg-red-500/10 hover:text-red-600',
};

export const IconButton = ({
  onClick,
  label,
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
