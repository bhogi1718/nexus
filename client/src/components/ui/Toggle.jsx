import React, { useId } from 'react';

export const Toggle = ({ checked, onChange, label, disabled = false }) => {
  const id = useId();

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full
        transition-colors duration-base ease-enter disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-primary' : 'bg-border-strong'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm
          transition-transform duration-base ease-spring
          ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
};
