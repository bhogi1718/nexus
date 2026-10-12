import React from 'react';
import { Icon } from './ui/Icon';

const idOf = (value) => String(value?._id || value?.id || value || '');

/**
 * Where one of our own messages is: sending → sent → delivered → read, or failed.
 * Delivered/read count only *other* people, so our own entries never qualify.
 */
export const messageStatus = (message, myId) => {
  if (message.failed || message.status === 'failed') return 'failed';
  if (message.isOptimistic || message.status === 'sending') return 'sending';
  const me = String(myId);
  if ((message.readBy || []).some(r => idOf(r.user) !== me)) return 'read';
  if ((message.deliveredTo || []).some(d => idOf(d) !== me)) return 'delivered';
  return 'sent';
};

const LABEL = {
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Not sent',
};

/**
 * WhatsApp-style ticks. `onBubble` picks colours for our own (filled) message
 * bubble; otherwise for normal surfaces such as the conversation list.
 */
export const MessageStatus = ({ status, onBubble = false, className = '' }) => {
  let content;
  if (status === 'sending') {
    content = (
      <span
        className={`inline-block w-[11px] h-[11px] rounded-full border-[1.5px] border-current border-t-transparent animate-spin
          ${onBubble ? 'opacity-80' : 'opacity-70'}`}
      />
    );
  } else if (status === 'failed') {
    content = <Icon name="error" className="text-[15px]" />;
  } else {
    const read = status === 'read';
    content = (
      <Icon
        name={status === 'sent' ? 'done' : 'done_all'}
        className={`text-[16px] transition-colors duration-base
          ${read ? (onBubble ? 'text-read-on-bubble' : 'text-read') : 'opacity-75'}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 flex-shrink-0 ${className}`}
      role="img"
      aria-label={LABEL[status]}
      title={LABEL[status]}
    >
      {content}
    </span>
  );
};
