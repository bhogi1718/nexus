import React from 'react';

export const ProfilePanel = ({ user }) => {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="p-6 bg-surface-container text-center flex-shrink-0 border-b border-outline-variant">
        <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center text-2xl font-bold text-on-primary-container mx-auto mb-3 ring-2 ring-primary">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <p className="font-bold text-lg text-on-surface">{user?.name}</p>
        <p className="text-sm text-on-surface-variant mb-2">{user?.email}</p>
        <p className="text-sm text-primary flex items-center justify-center gap-1">
          <span className="w-2 h-2 bg-primary rounded-full"></span> Online
        </p>
      </div>
    </div>
  );
};
