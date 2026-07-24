import React, { useRef, useEffect } from 'react';
import { Icon } from './ui/Icon';
import { MediaUploader } from './MediaUploader';

export const MessageInput = React.forwardRef(({
  value,
  onChange,
  onSubmit,
  fileInputRef,
  error,
  disabled,
  conversationId,
  onUploadSuccess
}, ref) => {
  const inputRef = useRef(null);

  useEffect(() => {
    const handleInputFocus = () => {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('focus', handleInputFocus);
      return () => input.removeEventListener('focus', handleInputFocus);
    }
  }, []);

  return (
    <form onSubmit={onSubmit} className="p-3 md:p-4 pb-3 md:pb-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-outline-variant bg-surface flex-shrink-0" ref={ref}>
      {error && (
        <div className="mb-2 md:mb-3 p-2.5 md:p-3 bg-error-container/20 border border-error/20 text-error text-xs md:text-sm rounded-lg flex items-center gap-2">
          <Icon name="error" className="text-[16px] flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="flex gap-2 md:gap-3 items-end">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <MediaUploader
            ref={fileInputRef}
            onUploadSuccess={onUploadSuccess}
            conversationId={conversationId}
          />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 px-3 md:px-4 py-2.5 md:py-2 border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-surface-container-high text-on-surface placeholder:text-outline text-sm md:text-base min-h-[40px]"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="px-4 md:px-6 py-2.5 md:py-2 bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-semibold rounded-lg transition-colors disabled:bg-outline-variant text-sm md:text-base min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <Icon name="send" className="text-[20px]" />
        </button>
      </div>
    </form>
  );
});

MessageInput.displayName = 'MessageInput';
