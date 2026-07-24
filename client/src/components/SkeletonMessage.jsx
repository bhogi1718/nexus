import React from 'react';

export const SkeletonMessage = ({ isCurrentUser }) => {
  return (
    <div className={`flex items-end gap-1 md:gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isCurrentUser && (
        <div className="w-6 md:w-8 h-6 md:h-8 bg-surface-container-high rounded-full flex-shrink-0 animate-pulse" />
      )}
      <div className={`max-w-[85%] md:max-w-sm px-3 md:px-4 py-2 md:py-3 rounded-2xl ${
        isCurrentUser
          ? 'rounded-br-none'
          : 'rounded-bl-none'
      }`}>
        <div className={`h-4 bg-surface-container-high rounded animate-pulse ${isCurrentUser ? 'w-48' : 'w-40'}`} />
        <div className={`h-3 bg-surface-container-high rounded animate-pulse mt-2 ${isCurrentUser ? 'w-32' : 'w-28'}`} />
      </div>
    </div>
  );
};
