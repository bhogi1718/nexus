import React, { useRef, useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { MessageStatus, messageStatus } from '../MessageStatus';

// Compact relative time: 14:02 today, "Yesterday", "Tue", then a date.
const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.round((startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);

  if (dayDiff <= 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export const ConversationListItem = ({
  conversation,
  isSelected,
  name,
  isUnknown,
  onClick,
  onDelete,
  currentUserId,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pressTimer = useRef(null);
  const longPressed = useRef(false);
  const unread = conversation.unreadCount || 0;

  // Touch: long-press opens the delete prompt (the hover button is desktop-only).
  const onPointerDown = (e) => {
    if (!onDelete || e.pointerType !== 'touch') return;
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setConfirmDelete(true);
    }, 500);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);
  const handleClick = (e) => {
    if (longPressed.current) {
      e.preventDefault();
      longPressed.current = false;
      return;
    }
    onClick?.(e);
  };
  const handleContextMenu = (e) => {
    if (!onDelete) return;
    e.preventDefault();
    setConfirmDelete(true);
  };
  const hasUnread = unread > 0;

  const last = conversation.lastMessage;
  const sentByMe = last && String(last.sender?._id || last.sender?.id || last.sender) === String(currentUserId);
  const isMedia = Boolean(last?.fileUrl);

  const otherParticipant = conversation.participants?.find(
    p => String(p._id) !== String(currentUserId)
  );
  const isOnline = Boolean(otherParticipant?.isOnline);

  let preview;
  if (!last) preview = 'No messages yet';
  else if (last.undecryptable) preview = 'Encrypted message';
  else if (isMedia) preview = last.fileName || 'Attachment';
  else preview = last.content || '';

  return (
    <>
      <div className="group relative">
        <button
          onClick={handleClick}
          onPointerDown={onPointerDown}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={handleContextMenu}
          aria-current={isSelected ? 'true' : undefined}
          className={`w-full text-left px-md py-3 min-h-[72px] flex items-center gap-sm
            transition-colors duration-fast relative
            ${isSelected
              ? 'bg-surface-accent'
              : hasUnread
                ? 'bg-primary-subtle/40 hover:bg-surface-accent/70'
                : 'hover:bg-surface-sunken'}`}
        >
          {isSelected && (
            <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full" />
          )}

          <Avatar name={name} size="md" showStatus isOnline={isOnline} />

          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5">
              <span className={`truncate text-title-sm ${hasUnread ? 'text-content font-bold' : 'text-content'}`}>
                {name}
              </span>
              {isUnknown && (
                <span className="px-1.5 py-0.5 bg-surface-sunken text-content-muted text-[10px] font-semibold rounded-full flex-shrink-0 uppercase tracking-wide">
                  New
                </span>
              )}
            </span>

            <span className={`flex items-center gap-1 mt-0.5 text-body-sm truncate
              ${hasUnread ? 'text-content font-medium' : 'text-content-muted'}`}>
              {sentByMe && <MessageStatus status={messageStatus(last, currentUserId)} />}
              {last?.undecryptable && <Icon name="lock" className="text-[14px] flex-shrink-0" />}
              {isMedia && !last?.undecryptable && <Icon name="attach_file" className="text-[14px] flex-shrink-0" />}
              <span className="truncate">{preview}</span>
            </span>
          </span>

          <span className={`flex flex-col items-end gap-1 flex-shrink-0 self-start pt-0.5 transition-opacity duration-fast
            ${onDelete ? 'md:group-hover:opacity-0 md:group-focus-within:opacity-0' : ''}`}>
            <span className={`text-caption tabular-nums ${hasUnread ? 'text-primary font-semibold' : 'text-content-muted'}`}>
              {formatTimestamp(conversation.lastMessageAt)}
            </span>
            {hasUnread
              ? <Badge count={unread} />
              : <span className="h-[22px] w-px" aria-hidden="true" />}
          </span>
        </button>

        {onDelete && (
          <IconButton
            label={`Delete conversation with ${name}`}
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            variant="danger"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 focus-visible:opacity-100 md:group-hover:opacity-100 transition-opacity duration-fast"
          >
            <Icon name="delete" className="text-[18px]" />
          </IconButton>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete?.(); }}
        title="Delete this conversation?"
        message={`This removes your copy of the conversation with ${name}. It stays visible to them until they delete it too.`}
        confirmLabel="Delete"
        danger
      />
    </>
  );
};
