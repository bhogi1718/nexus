import React from 'react';

const SIZE = {
  xs: { box: 'w-7 h-7', text: 'text-[11px]', dot: 'w-2 h-2' },
  sm: { box: 'w-9 h-9', text: 'text-xs', dot: 'w-2.5 h-2.5' },
  md: { box: 'w-11 h-11', text: 'text-sm', dot: 'w-3 h-3' },
  lg: { box: 'w-14 h-14', text: 'text-lg', dot: 'w-3.5 h-3.5' },
  xl: { box: 'w-20 h-20', text: 'text-2xl', dot: 'w-4 h-4' },
  '2xl': { box: 'w-28 h-28', text: 'text-4xl', dot: 'w-5 h-5' },
};

// Five tints drawn from the palette so avatars vary without leaving the system.
const TINTS = [
  'from-[#6B4A5E] to-[#3E2A3A]',
  'from-[#A8788E] to-[#6B4A5E]',
  'from-[#D49AAE] to-[#A8788E]',
  'from-[#8A5F73] to-[#4E3647]',
  'from-[#B98499] to-[#7A5668]',
];

const tintFor = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
};

export const Avatar = ({
  name,
  src,
  size = 'md',
  showStatus = false,
  isOnline = false,
  ring = false,
  className = '',
}) => {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || '?';
  const dims = SIZE[size] || SIZE.md;

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name ? `${name}'s avatar` : 'Avatar'}
          className={`${dims.box} rounded-full object-cover ${ring ? 'ring-2 ring-surface ring-offset-2 ring-offset-bg' : ''}`}
        />
      ) : (
        <div
          className={`${dims.box} ${dims.text} rounded-full bg-gradient-to-br ${tintFor(name)} flex items-center justify-center text-white font-semibold select-none ${ring ? 'ring-2 ring-surface ring-offset-2 ring-offset-bg' : ''}`}
        >
          {initial}
        </div>
      )}

      {/* Dot only for online: a coloured dot on offline contacts reads as "active". */}
      {showStatus && isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dims.dot} rounded-full ring-2 ring-surface bg-success`}
          aria-label="Online"
        />
      )}
    </div>
  );
};
