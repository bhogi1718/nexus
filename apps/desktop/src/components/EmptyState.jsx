import React from 'react';

export const EmptyState = ({ type, onAction }) => {
  const configs = {
    noConversations: {
      icon: '💬',
      title: 'No conversations yet',
      description: 'Start a conversation by adding a contact or searching for users',
      actionLabel: 'Add Contact',
      actionIcon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    },
    noMessages: {
      icon: '👋',
      title: 'No messages yet',
      description: 'Start the conversation by sending a message',
      actionLabel: 'Send Message',
      actionIcon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    noContacts: {
      icon: '📋',
      title: 'No contacts yet',
      description: 'Add your first contact by email to get started',
      actionLabel: 'Add Contact',
      actionIcon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM9 19a7 7 0 1114 0" />
        </svg>
      )
    },
    selectConversation: {
      icon: '👈',
      title: 'Select a conversation',
      description: 'Choose a conversation from the sidebar to start messaging',
      actionLabel: null,
      actionIcon: null
    }
  };

  const config = configs[type] || configs.noConversations;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="text-5xl md:text-6xl mb-4">{config.icon}</div>
      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">{config.title}</h3>
      <p className="text-sm md:text-base text-gray-500 max-w-sm mb-6">{config.description}</p>
      {config.actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors min-h-[40px]"
        >
          {config.actionIcon}
          {config.actionLabel}
        </button>
      )}
    </div>
  );
};
