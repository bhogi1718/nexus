import React from 'react';

// Shape matches MessageBubble so content doesn't jump when it loads in.
export const SkeletonMessage = ({ isCurrentUser }) => (
  <div className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`} aria-hidden="true">
    {!isCurrentUser && <div className="w-7 h-7 rounded-full skeleton-shimmer flex-shrink-0" />}
    <div
      className={`skeleton-shimmer rounded-[20px] ${isCurrentUser ? 'rounded-br-[6px]' : 'rounded-bl-[6px]'}
        ${isCurrentUser ? 'w-48 h-12' : 'w-60 h-16'}`}
    />
  </div>
);
