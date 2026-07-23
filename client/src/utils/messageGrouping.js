const GROUP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const getSenderId = (message) => String(message.sender?._id || message.sender?.id || message.sender);

const isSameDay = (a, b) => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

const formatDateLabel = (date) => {
  const d = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';

  const daysDiff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return d.toLocaleDateString([], { weekday: 'long' });
  }
  return d.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

// Converts a flat message list into a render-ready timeline: date separators
// interleaved with messages, each message flagged for whether it starts/ends
// a visual group of consecutive same-sender messages (for avatar/name collapsing).
export const buildMessageTimeline = (messages) => {
  const timeline = [];

  messages.forEach((message, index) => {
    const prev = messages[index - 1];
    const next = messages[index + 1];

    if (!prev || !isSameDay(prev.createdAt, message.createdAt)) {
      timeline.push({ type: 'date', key: `date-${message._id}`, label: formatDateLabel(message.createdAt) });
    }

    const sameSenderAsPrev = prev && getSenderId(prev) === getSenderId(message) && isSameDay(prev.createdAt, message.createdAt);
    const closeToPrevTime = prev && (new Date(message.createdAt) - new Date(prev.createdAt)) < GROUP_THRESHOLD_MS;
    const isFirstInGroup = !(sameSenderAsPrev && closeToPrevTime);

    const sameSenderAsNext = next && getSenderId(next) === getSenderId(message) && isSameDay(next.createdAt, message.createdAt);
    const closeToNextTime = next && (new Date(next.createdAt) - new Date(message.createdAt)) < GROUP_THRESHOLD_MS;
    const isLastInGroup = !(sameSenderAsNext && closeToNextTime);

    timeline.push({ type: 'message', key: message._id, message, isFirstInGroup, isLastInGroup });
  });

  return timeline;
};
