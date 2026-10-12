import React from 'react';
import { Icon } from './Icon';

const VARIANT = {
  primary: 'bg-primary text-content-on-primary hover:bg-primary-hover shadow-sm hover:shadow-md',
  secondary: 'bg-surface text-content border border-border-strong hover:bg-surface-sunken hover:border-border-interactive',
  subtle: 'bg-surface-accent text-content hover:bg-accent/60',
  ghost: 'text-content-secondary hover:bg-surface-sunken hover:text-content',
  danger: 'bg-danger text-white hover:brightness-110 shadow-sm',
};

const SIZE = {
  sm: 'text-body-sm px-sm py-1.5 gap-1.5 rounded-lg min-h-[36px]',
  md: 'text-title-sm px-md py-2.5 gap-sm rounded-lg min-h-[44px]',
  lg: 'text-title-md px-lg py-3.5 gap-sm rounded-xl min-h-[52px]',
};

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
  ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`inline-flex items-center justify-center font-semibold transition-all duration-fast ease-enter
      active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
      ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    {...props}
  >
    {loading ? (
      <Icon name="progress_activity" className="animate-spin text-[20px]" />
    ) : icon ? (
      <Icon name={icon} className="text-[20px]" />
    ) : null}
    {children}
    {iconRight && !loading && <Icon name={iconRight} className="text-[20px]" />}
  </button>
));

Button.displayName = 'Button';
