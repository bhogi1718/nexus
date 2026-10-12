import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Icon } from './Icon';

const ToastContext = createContext(null);

const TONE = {
  info: { icon: 'info', cls: 'bg-surface border-border text-content' },
  success: { icon: 'check_circle', cls: 'bg-success-subtle border-success/30 text-success' },
  error: { icon: 'error', cls: 'bg-danger-subtle border-danger/30 text-danger' },
  warning: { icon: 'warning', cls: 'bg-warning-subtle border-warning/30 text-warning' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const notify = useCallback((message, tone = 'info', duration = 4000) => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, tone }]);
    if (duration) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({
    notify,
    dismiss,
    success: (m, d) => notify(m, 'success', d),
    error: (m, d) => notify(m, 'error', d),
    warning: (m, d) => notify(m, 'warning', d),
  }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[60] left-1/2 -translate-x-1/2 top-[calc(0.75rem+env(safe-area-inset-top))]
          md:left-auto md:translate-x-0 md:right-lg md:top-[4.75rem]
          flex flex-col gap-sm w-[min(24rem,calc(100vw-1.5rem))] pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map(t => {
          const tone = TONE[t.tone] || TONE.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-sm px-md py-3 rounded-xl border shadow-lg animate-fade-in-up ${tone.cls}`}
            >
              <Icon name={tone.icon} className="text-[20px] flex-shrink-0 mt-px" />
              <p className="flex-1 text-body-md min-w-0 text-pretty">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
