const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const clock = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** "last seen today at 14:02", "last seen yesterday at 09:15", "last seen 3 Oct at 18:40". */
export const formatLastSeen = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (sameDay(date, now)) return `last seen today at ${clock(date)}`;
  if (sameDay(date, yesterday)) return `last seen yesterday at ${clock(date)}`;
  const sameYear = date.getFullYear() === now.getFullYear();
  const day = date.toLocaleDateString([], sameYear
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
  return `last seen ${day} at ${clock(date)}`;
};

/** Presence line for a person: "online", "last seen …", or nothing when hidden. */
export const presenceLabel = (person) => {
  if (!person) return null;
  if (person.isOnline) return 'online';
  return formatLastSeen(person.lastSeen);
};

export const formatMonthYear = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString([], { month: 'long', year: 'numeric' });
};
