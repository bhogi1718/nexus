import React from 'react';

export const ChatHeader = ({ conversation, onBack, user }) => {
  if (!conversation) return null;

  const otherUser = conversation.type === 'group'
    ? null
    : conversation.participants.find(p => String(p._id) !== String(user?.id));

  const isOnline = otherUser?.isOnline;
  const status = conversation.type === 'group'
    ? `${conversation.participants.length} members`
    : (isOnline ? 'Online' : 'Offline');

  return (
    <div className="p-3 md:p-4 border-b border-gray-100 bg-white flex-shrink-0">
      <div className="flex items-center justify-between gap-2 md:gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-xl font-bold text-gray-900 truncate">
            {conversation.name || (otherUser ? otherUser.name : 'Unknown')}
          </h2>
          <p className="text-xs md:text-sm text-gray-500">{status}</p>
        </div>
      </div>
    </div>
  );
};
