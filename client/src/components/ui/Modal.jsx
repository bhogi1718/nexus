import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const EXIT_MS = 200;

export const Modal = ({ isOpen, onClose, title, label, children, footer, padded = true, size = 'md' }) => {
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);
  // Kept mounted through the exit animation, then unmounted.
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  // Callers usually pass an inline onClose, which is a new function every render.
  // Reading it through a ref keeps beginClose stable, so the focus-management
  // effect below doesn't re-run (and steal focus) on every parent re-render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const beginClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onCloseRef.current();
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setRendered(false);
    }
  }, [isOpen, rendered]);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        beginClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    // Prefer a form field in the content over the header's Close button.
    const firstField = panelRef.current?.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])')
      || panelRef.current?.querySelector(FOCUSABLE);
    (firstField || panelRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen, beginClose]);

  if (!isOpen && !closing) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end md:items-center justify-center
        bg-surface-inverse/40 backdrop-blur-sm
        ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={beginClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label || title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${size === 'lg' ? 'md:max-w-lg' : 'md:max-w-md'}
          bg-surface text-content border border-border
          rounded-t-2xl md:rounded-2xl shadow-2xl outline-none
          max-h-[88vh] flex flex-col
          ${closing
            ? 'animate-sheet-slide-down md:animate-dialog-scale-out'
            : 'animate-sheet-slide-up md:animate-dialog-scale-in'}`}
      >
        {/* Grab handle, mobile sheet affordance */}
        <div className="md:hidden pt-2.5 pb-1 flex justify-center flex-shrink-0">
          <span className="w-9 h-1 rounded-full bg-border-strong" />
        </div>

        {title && (
          <div className="flex justify-between items-center px-md py-3 border-b border-border flex-shrink-0">
            <h2 className="text-title-lg font-display">{title}</h2>
            <IconButton label="Close" onClick={beginClose} size="sm">
              <Icon name="close" className="text-[20px]" />
            </IconButton>
          </div>
        )}

        <div className={`overflow-y-auto ${padded ? 'p-md' : ''}`}>{children}</div>

        {footer && (
          <div className="px-md py-3 border-t border-border flex-shrink-0 flex gap-sm justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
