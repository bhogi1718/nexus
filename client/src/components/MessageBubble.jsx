import React, { useRef, useState } from 'react';
import { Icon } from './ui/Icon';
import { MediaMessage } from './MediaMessage';

export const MessageBubble = ({ message, isCurrentUser, displayName, user, onLongPress, isFirstInGroup = true, isLastInGroup = true }) => {
  const bubbleRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  if (!message || !message.sender) return null;

  const displayContent = message.undecryptable ? null : message.content;
  const isRead = isCurrentUser && (message.readBy || []).some(r => String(r.user?._id || r.user) !== String(user?.id));
  const isDelivered = isCurrentUser && (message.deliveredTo || []).some(d => String(d?._id || d) !== String(user?.id));

  const handlePointerDown = () => {
    setIsPressed(true);
    longPressTimeoutRef.current = setTimeout(() => {
      if (onLongPress) {
        onLongPress(message);
      }
    }, 500);
  };

  const handlePointerUp = () => {
    setIsPressed(false);
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
  };

  return (
    <div className={`flex items-end gap-1 md:gap-2 animate-fade-in-up ${isCurrentUser ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2.5' : 'mt-0.5'}`}>
      {!isCurrentUser && (
        isLastInGroup ? (
          <div className="w-6 md:w-8 h-6 md:h-8 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container text-xs font-bold flex-shrink-0">
            {message.sender?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        ) : (
          <div className="w-6 md:w-8 flex-shrink-0" aria-hidden="true" />
        )
      )}
      <div
        ref={bubbleRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ borderRadius: isCurrentUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px' }}
        className={`max-w-[85%] md:max-w-sm px-3 md:px-4 py-2 md:py-3 text-sm md:text-base cursor-pointer transition-opacity ${
          isPressed ? 'opacity-75' : 'opacity-100'
        } ${
          isCurrentUser
            ? 'bg-primary-container text-on-primary-container'
            : 'bg-surface-container-high text-on-surface'
        }`}>
        {!isCurrentUser && isFirstInGroup && (
          <p className="text-xs font-semibold text-on-surface-variant mb-0.5">{displayName}</p>
        )}
        {message.fileUrl && <MediaMessage message={message} isCurrentUser={isCurrentUser} />}
        {!message.fileUrl && displayContent && <p className="break-words text-sm">{displayContent}</p>}
        {message.undecryptable && <p className="text-sm italic opacity-60">🔒 Encrypted</p>}
        <p className={`text-xs mt-1 md:mt-2 flex items-center gap-1 ${
          isCurrentUser ? 'text-on-primary-container/70 justify-end' : 'text-on-surface-variant'
        }`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isCurrentUser && (
            <span className={message.isOptimistic ? 'opacity-50' : isRead ? 'opacity-100' : 'opacity-70'}>
              {message.isOptimistic ? (
                <Icon name="schedule" className="text-[14px]" />
              ) : (isRead || isDelivered) ? (
                <Icon name="done_all" className="text-[14px]" />
              ) : (
                <Icon name="done" className="text-[14px]" />
              )}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
