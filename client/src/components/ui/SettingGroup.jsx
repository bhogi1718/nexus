import React from 'react';
import { Icon } from './Icon';

export const SettingGroup = ({ title, description, children, className = '' }) => (
  <section className={`mb-lg ${className}`}>
    {title && (
      <h3 className="font-sans text-label-caps uppercase text-content-muted px-xs mb-sm">{title}</h3>
    )}
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden divide-y divide-border">
      {children}
    </div>
    {description && (
      <p className="text-body-sm text-content-muted mt-sm px-xs">{description}</p>
    )}
  </section>
);

/**
 * One row inside a SettingGroup. Renders as a button when `onClick` is given,
 * otherwise as a static row (for read-only values or a custom `action` control).
 */
export const SettingRow = ({
  icon,
  label,
  value,
  description,
  action,
  onClick,
  danger = false,
  chevron = false,
}) => {
  const content = (
    <>
      {icon && (
        <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
          ${danger ? 'bg-danger-subtle text-danger' : 'bg-surface-accent text-content-secondary'}`}>
          <Icon name={icon} className="text-[20px]" />
        </span>
      )}

      <span className="flex-1 min-w-0 text-left">
        <span className={`block text-title-sm ${danger ? 'text-danger' : 'text-content'}`}>{label}</span>
        {description && (
          <span className="block text-body-sm text-content-muted mt-0.5">{description}</span>
        )}
      </span>

      {value && (
        <span className="text-body-sm text-content-muted flex-shrink-0 max-w-[45%] truncate">{value}</span>
      )}
      {action}
      {chevron && <Icon name="chevron_right" className="text-[20px] text-content-muted flex-shrink-0" />}
    </>
  );

  const base = 'w-full flex items-center gap-sm px-md py-3.5 min-h-[56px]';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} text-left transition-colors duration-fast hover:bg-surface-sunken active:bg-surface-accent/60`}
      >
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
};
