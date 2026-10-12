import React from 'react';

export const Skeleton = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded-lg ${className}`} aria-hidden="true" />
);

export const SkeletonListItem = () => (
  <div className="flex items-center gap-sm px-md py-3 min-h-[72px]" aria-hidden="true">
    <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="h-3 w-3/5" />
    </div>
    <Skeleton className="h-2.5 w-8 flex-shrink-0" />
  </div>
);

export const SkeletonList = ({ count = 6 }) => (
  <div className="divide-y divide-border" role="status" aria-label="Loading">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonListItem key={i} />
    ))}
  </div>
);
