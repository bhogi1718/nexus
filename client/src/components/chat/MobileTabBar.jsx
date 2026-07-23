import React from 'react';

export const MobileTabBar = ({ activeTab, onSelectChats, onSelectContacts, onSelectProfile }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
      <button
        onClick={onSelectChats}
        className={`flex-1 py-3 px-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'chats' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <svg className="w-6 h-6" fill={activeTab === 'chats' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-xs font-medium">Chats</span>
      </button>
      <button
        onClick={onSelectContacts}
        className={`flex-1 py-3 px-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'contacts' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <svg className="w-6 h-6" fill={activeTab === 'contacts' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span className="text-xs font-medium">Contacts</span>
      </button>
      <button
        onClick={onSelectProfile}
        className={`flex-1 py-3 px-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <svg className="w-6 h-6" fill={activeTab === 'profile' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-xs font-medium">Profile</span>
      </button>
    </div>
  );
};
