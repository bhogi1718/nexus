import React, { useEffect, useRef } from 'react';

// `value` is positional: a space marks an empty box, so clearing a middle digit
// doesn't shift the ones after it. Callers check completeness with isOtpComplete.
const EMPTY = ' ';

export const isOtpComplete = (value, length = 6) => new RegExp(`^\\d{${length}}$`).test(value);

export const OtpInput = ({ value, onChange, length = 6, autoFocus = true, disabled = false }) => {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => (value[i] && value[i] !== EMPTY ? value[i] : ''));

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const emit = (next) => onChange(next.map(d => d || EMPTY).join('').trimEnd());

  const setDigit = (index, digit) => {
    const next = [...digits];
    next[index] = digit;
    emit(next);
  };

  const handleChange = (index, raw) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) {
      setDigit(index, '');
      return;
    }
    // Autofill or fast typing can deliver several digits into one box.
    if (clean.length > 1) {
      const next = [...digits];
      clean.split('').slice(0, length - index).forEach((d, i) => { next[index + i] = d; });
      emit(next);
      refs.current[Math.min(index + clean.length, length - 1)]?.focus();
      return;
    }
    setDigit(index, clean);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      setDigit(index - 1, '');
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-between gap-1.5 sm:gap-sm" role="group" aria-label="Verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={el => (refs.current[index] = el)}
          value={digit}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={`w-full max-w-[3.25rem] aspect-[4/5] text-center text-2xl font-semibold tabular-nums
            bg-surface text-content rounded-xl border transition-all duration-fast
            focus:outline-none focus:border-accent-strong focus:ring-4 focus:ring-accent/25
            ${digit ? 'border-accent-strong' : 'border-border-interactive/50'}`}
        />
      ))}
    </div>
  );
};
