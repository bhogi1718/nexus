import React from 'react';
import { MediaMessage } from './MediaMessage';

export const MessageBubble = ({ message, isCurrentUser, displayName, user }) => {
  if (!message || !message.sender) return null;

  const displayContent = message.undecryptable ? null : message.content;
  const isRead = isCurrentUser && (message.readBy || []).some(r => String(r.user?._id || r.user) !== String(user?.id));
  const isDelivered = isCurrentUser && (message.deliveredTo || []).some(d => String(d?._id || d) !== String(user?.id));

  return (
    <div className={`flex items-end gap-1 md:gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <div className="w-6 md:w-8 h-6 md:h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {message.sender?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      )}
      <div className={`max-w-[85%] md:max-w-sm px-3 md:px-4 py-2 md:py-3 rounded-2xl text-sm md:text-base ${
        isCurrentUser
          ? 'bg-blue-600 text-white rounded-br-none'
          : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
      }`}>
        {!isCurrentUser && (
          <p className="text-xs font-semibold text-gray-500 mb-0.5">{displayName}</p>
        )}
        {message.fileUrl && <MediaMessage message={message} isCurrentUser={isCurrentUser} />}
        {!message.fileUrl && displayContent && <p className="break-words text-sm">{displayContent}</p>}
        {message.undecryptable && <p className="text-sm italic opacity-60">🔒 Encrypted</p>}
        <p className={`text-xs mt-1 md:mt-2 flex items-center gap-0.5 ${
          isCurrentUser ? 'text-blue-100 justify-end' : 'text-gray-400'
        }`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isCurrentUser && (
            <span className={`font-bold ${message.isOptimistic ? 'text-blue-300' : isRead ? 'text-cyan-300' : 'text-blue-100'}`}>
              {message.isOptimistic ? '🕓' : (isRead || isDelivered) ? '✓✓' : '✓'}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
