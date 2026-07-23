import React from 'react';
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
  return (
    <form onSubmit={onSubmit} className="p-3 md:p-4 pb-3 md:pb-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-gray-100 bg-white flex-shrink-0" ref={ref}>
      {error && (
        <div className="mb-2 md:mb-3 p-2.5 md:p-3 bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
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
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 px-3 md:px-4 py-2.5 md:py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base min-h-[40px]"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="px-4 md:px-6 py-2.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 text-sm md:text-base min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          Send
        </button>
      </div>
    </form>
  );
});

MessageInput.displayName = 'MessageInput';
