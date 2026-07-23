import React from 'react';

export const DateSeparator = ({ label }) => (
  <div className="flex items-center justify-center my-1">
    <span className="px-3 py-1 bg-gray-200/70 text-gray-600 text-xs font-medium rounded-full">
      {label}
    </span>
  </div>
);
