import React from 'react';

export const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-1 px-3 md:px-4 py-1 md:py-2 text-gray-500 text-xs md:text-sm">
      <span className="flex gap-1">
        <span className="w-1 md:w-2 h-1 md:h-2 bg-gray-400 rounded-full animate-bounce"></span>
        <span className="w-1 md:w-2 h-1 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
        <span className="w-1 md:w-2 h-1 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
      </span>
      Someone is typing...
    </div>
  );
};
