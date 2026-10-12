import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { MediaUploader } from './MediaUploader';

const MAX_HEIGHT_PX = 160;

const EMOJI = [
  '😀', '😂', '🥹', '😊', '😍', '🥰', '😘', '😉',
  '🤔', '🙃', '😅', '😭', '😤', '😴', '🤗', '😎',
  '👍', '👎', '👏', '🙏', '💪', '👋', '🤝', '✌️',
  '❤️', '💜', '🩷', '✨', '🔥', '🎉', '🌸', '☕',
];

export const MessageInput = React.forwardRef(({
  value,
  onChange,
  onSubmit,
  fileInputRef,
  disabled,
  conversationId,
  onUploadSuccess,
}, ref) => {
  const textareaRef = useRef(null);
  const formRef = useRef(null);
  const emojiRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const canSend = !disabled && value.trim().length > 0;

  React.useImperativeHandle(ref, () => formRef.current);

  // Grow with the content up to a cap, then scroll inside.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  // Focus the composer whenever a conversation is opened.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) textareaRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    if (!showEmoji) return;
    const close = (e) => {
      if (!emojiRef.current?.contains(e.target)) setShowEmoji(false);
    };
    const onKey = (e) => e.key === 'Escape' && setShowEmoji(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [showEmoji]);

  const handleKeyDown = (e) => {
    // Enter sends; Shift+Enter inserts a newline. Ignore while an IME is composing.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) formRef.current?.requestSubmit();
    }
  };

  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    onChange({ target: { value: next } });
    requestAnimationFrame(() => {
      el?.focus();
      const caret = start + emoji.length;
      el?.setSelectionRange(caret, caret);
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="px-sm md:px-md pt-sm pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-md border-t border-border bg-surface/90 backdrop-blur-md flex-shrink-0"
    >
      <div className="max-w-reading mx-auto flex items-end gap-xs">
        <div className="flex-shrink-0">
          <MediaUploader ref={fileInputRef} onUploadSuccess={onUploadSuccess} conversationId={conversationId} />
        </div>

        <div className="flex-1 min-w-0 relative flex items-end bg-surface-sunken border border-transparent rounded-2xl
          focus-within:bg-surface focus-within:border-accent-strong focus-within:ring-4 focus-within:ring-accent/20
          transition-all duration-fast">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…"
            disabled={disabled}
            aria-label="Message"
            className="flex-1 min-w-0 resize-none bg-transparent px-md py-2.5 text-body-md text-content
              placeholder:text-content-muted/60 focus:outline-none max-h-40 leading-6"
          />

          <div ref={emojiRef} className="relative flex-shrink-0">
            <IconButton label="Insert emoji" size="sm" onClick={() => setShowEmoji(v => !v)} className="m-1">
              <Icon name="mood" className="text-[22px]" />
            </IconButton>

            {showEmoji && (
              <div
                role="dialog"
                aria-label="Emoji picker"
                className="absolute bottom-full right-0 mb-sm w-[17rem] p-sm bg-surface border border-border rounded-xl shadow-lg animate-fade-in-up z-20"
              >
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJI.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="h-8 rounded-md text-xl flex items-center justify-center hover:bg-surface-sunken active:scale-90 transition-transform"
                      aria-label={`Insert ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
            transition-all duration-base ease-spring
            ${canSend
              ? 'bg-primary text-content-on-primary shadow-md hover:bg-primary-hover active:scale-90 scale-100'
              : 'bg-surface-sunken text-content-muted scale-95 cursor-not-allowed'}`}
        >
          <Icon name="arrow_upward" className="text-[22px]" />
        </button>
      </div>
    </form>
  );
});

MessageInput.displayName = 'MessageInput';
