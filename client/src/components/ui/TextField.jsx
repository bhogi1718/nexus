import React, { useId } from 'react';
import { Icon } from './Icon';

export const TextField = React.forwardRef(({
  label,
  icon,
  hint,
  error,
  className = '',
  containerClassName = '',
  id,
  ...props
}, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={fieldId} className="block text-label-caps uppercase text-content-secondary mb-1.5">
          {label}
        </label>
      )}

      <div className="relative group">
        {icon && (
          <Icon
            name={icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-content-muted/70 group-focus-within:text-accent-strong transition-colors pointer-events-none"
          />
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full bg-surface text-content placeholder:text-content-muted/55 rounded-lg
            border transition-all duration-fast
            ${icon ? 'pl-10' : 'pl-md'} pr-md py-2.5 min-h-[44px]
            ${error
              ? 'border-danger focus:border-danger focus:ring-4 focus:ring-danger/20'
              : 'border-border-interactive/50 focus:border-accent-strong focus:ring-4 focus:ring-accent/25'}
            focus:outline-none ${className}`}
          {...props}
        />
      </div>

      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-body-sm text-danger flex items-center gap-1">
          <Icon name="error" className="text-[16px]" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-body-sm text-content-muted">{hint}</p>
      ) : null}
    </div>
  );
});

TextField.displayName = 'TextField';
