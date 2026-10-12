import React, { useRef, useState } from 'react';
import { Avatar } from './ui/Avatar';
import { Icon } from './ui/Icon';
import { MediaMessage } from './MediaMessage';
import { MessageStatus, messageStatus } from './MessageStatus';

const LONG_PRESS_MS = 450;

// Corners on the sender's side tighten so a run of consecutive bubbles reads as
// one block; only the first bubble in the run keeps a round top corner.
const radiusFor = (mine, first) => {
  if (mine) return `rounded-[20px] rounded-br-[6px] ${first ? '' : 'rounded-tr-[6px]'}`;
  return `rounded-[20px] rounded-bl-[6px] ${first ? '' : 'rounded-tl-[6px]'}`;
};

export const MessageBubble = ({
  message,
  isCurrentUser,
  displayName,
  user,
  onLongPress,
  onRetry,
  isFirstInGroup = true,
  isLastInGroup = true,
}) => {
  const timerRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  if (!message || !message.sender) return null;

  const status = isCurrentUser ? messageStatus(message, user?.id) : null;
  const failed = status === 'failed';

  // Long-press is a touch gesture; mouse users get right-click and the hover button.
  const handlePointerDown = (e) => {
    if (e.pointerType !== 'touch') return;
    setIsPressed(true);
    timerRef.current = setTimeout(() => onLongPress?.(message), LONG_PRESS_MS);
  };

  const cancelPress = () => {
    setIsPressed(false);
    clearTimeout(timerRef.current);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    onLongPress?.(message);
  };

  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`group flex items-end gap-2 animate-bubble-in
        ${isCurrentUser ? 'justify-end' : 'justify-start'}
        ${isFirstInGroup ? 'mt-3' : 'mt-[3px]'}`}
    >
      {!isCurrentUser && (
        isLastInGroup
          ? <Avatar name={message.sender?.name || displayName} size="xs" className="mb-0.5" />
          : <span className="w-7 flex-shrink-0" aria-hidden="true" />
      )}

      {/* Desktop hover action, sits beside the bubble */}
      {isCurrentUser && onLongPress && (
        <MoreButton onClick={() => onLongPress(message)} />
      )}

      <div
        onPointerDown={handlePointerDown}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={handleContextMenu}
        className={`max-w-[80%] sm:max-w-[70%] md:max-w-[60%] px-3.5 py-2 shadow-xs select-text
          transition-transform duration-fast ${isPressed ? 'scale-[0.98]' : ''}
          ${radiusFor(isCurrentUser, isFirstInGroup)}
          ${isCurrentUser
            ? 'bg-primary text-content-on-primary'
            : 'bg-surface text-content border border-border'}
          ${failed ? 'opacity-80' : ''}`}
      >
        {!isCurrentUser && isFirstInGroup && displayName && (
          <p className="text-caption font-semibold text-content-secondary mb-0.5">{displayName}</p>
        )}

        {message.fileUrl && <MediaMessage message={message} isCurrentUser={isCurrentUser} />}

        {!message.fileUrl && !message.undecryptable && message.content && (
          <p className="text-body-md whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {message.undecryptable && (
          <p className="text-body-md italic opacity-70 flex items-center gap-1.5">
            <Icon name="lock" className="text-[16px]" />
            This message can't be decrypted on this device
          </p>
        )}

        <span className={`mt-0.5 flex items-center gap-1 text-[11px] tabular-nums
          ${isCurrentUser ? 'justify-end text-content-on-primary/70' : 'text-content-muted'}`}>
          {failed ? 'Not sent' : time}
          {status && <MessageStatus status={status} onBubble />}
        </span>
      </div>

      {failed && onRetry && (
        <button
          type="button"
          onClick={() => onRetry(message)}
          className="self-center flex items-center gap-1 px-2.5 py-1 rounded-full bg-danger-subtle text-danger text-caption font-semibold transition-colors hover:bg-danger hover:text-white"
        >
          <Icon name="refresh" className="text-[14px]" />
          Retry
        </button>
      )}

      {!isCurrentUser && onLongPress && (
        <MoreButton onClick={() => onLongPress(message)} />
      )}
    </div>
  );
};

const MoreButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Message options"
    className="hidden md:flex self-center w-8 h-8 rounded-full items-center justify-center text-content-muted
      opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-surface-sunken hover:text-content
      transition-all duration-fast"
  >
    <Icon name="more_horiz" className="text-[20px]" />
  </button>
);
