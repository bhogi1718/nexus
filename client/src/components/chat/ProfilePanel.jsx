import React from 'react';

export const ProfilePanel = ({ user }) => {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center flex-shrink-0">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <p className="font-bold text-lg">{user?.name}</p>
        <p className="text-sm text-blue-100 mb-2">{user?.email}</p>
        <p className="text-sm text-green-300 flex items-center justify-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span> Online
        </p>
      </div>
    </div>
  );
};
