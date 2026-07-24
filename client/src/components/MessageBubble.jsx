import React, { useRef, useState } from 'react';
import { Clock, Check, CheckCheck } from 'lucide-react';
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
    <div className={`flex items-end gap-1 md:gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2.5' : 'mt-0.5'}`}>
      {!isCurrentUser && (
        isLastInGroup ? (
          <div className="w-6 md:w-8 h-6 md:h-8 bg-gradient-to-br from-accent to-accent-hover rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
        className={`max-w-[85%] md:max-w-sm px-3 md:px-4 py-2 md:py-3 rounded-2xl text-sm md:text-base cursor-pointer transition-opacity ${
          isPressed ? 'opacity-75' : 'opacity-100'
        } ${
          isCurrentUser
            ? `bg-accent text-white ${isLastInGroup ? 'rounded-br-none' : ''}`
            : `bg-card text-text-primary border border-border ${isLastInGroup ? 'rounded-bl-none' : ''}`
        }`}>
        {!isCurrentUser && isFirstInGroup && (
          <p className="text-xs font-semibold text-text-muted mb-0.5">{displayName}</p>
        )}
        {message.fileUrl && <MediaMessage message={message} isCurrentUser={isCurrentUser} />}
        {!message.fileUrl && displayContent && <p className="break-words text-sm">{displayContent}</p>}
        {message.undecryptable && <p className="text-sm italic opacity-60">🔒 Encrypted</p>}
        <p className={`text-xs mt-1 md:mt-2 flex items-center gap-1 ${
          isCurrentUser ? 'text-white/70 justify-end' : 'text-text-muted'
        }`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isCurrentUser && (
            <span className={message.isOptimistic ? 'text-white/50' : isRead ? 'text-white' : 'text-white/70'}>
              {message.isOptimistic ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (isRead || isDelivered) ? (
                <CheckCheck className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
