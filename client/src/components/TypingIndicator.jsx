import React from 'react';

export const TypingIndicator = () => (
  <div className="flex items-end gap-2 mt-3 animate-bubble-in" role="status" aria-label="Typing">
    <span className="w-7 flex-shrink-0" aria-hidden="true" />
    <div className="flex items-center gap-1 px-4 py-3 bg-surface border border-border rounded-[20px] rounded-bl-[6px] shadow-xs">
      {[0, 160, 320].map(delay => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-accent-strong animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: '1s' }}
        />
      ))}
    </div>
  </div>
);
