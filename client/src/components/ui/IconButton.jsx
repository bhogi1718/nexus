import React from 'react';

const SIZE_CLASSES = {
  sm: 'min-w-[36px] min-h-[36px] p-1.5',
  md: 'min-w-[44px] min-h-[44px] p-2',
};

const VARIANT_CLASSES = {
  default: 'text-content-secondary hover:bg-surface-sunken hover:text-content',
  accent: 'text-primary hover:bg-surface-accent',
  danger: 'text-danger hover:bg-danger-subtle',
  inverse: 'text-content-inverse/80 hover:bg-white/10 hover:text-content-inverse',
};

export const IconButton = React.forwardRef(({
  onClick,
  label,
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`flex items-center justify-center rounded-lg transition-all duration-fast
      active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
      ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
));

IconButton.displayName = 'IconButton';
