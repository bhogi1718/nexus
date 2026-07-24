import React from 'react';
import { Icon } from './ui/Icon';
import { SecureCoreHero } from './SecureCoreHero';

export const EmptyState = ({ type, onAction }) => {
  const configs = {
    noConversations: {
      icon: 'forum',
      title: 'No conversations yet',
      description: 'Start a conversation by adding a contact or searching for users',
      actionLabel: 'Add Contact',
      actionIcon: 'add',
    },
    noMessages: {
      icon: 'waving_hand',
      title: 'No messages yet',
      description: 'Start the conversation by sending a message',
      actionLabel: 'Send Message',
      actionIcon: 'send',
    },
    noContacts: {
      icon: 'person_add',
      title: 'No contacts yet',
      description: 'Add your first contact by email to get started',
      actionLabel: 'Add Contact',
      actionIcon: 'add',
    },
  };

  if (type === 'selectConversation') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4be277 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="w-full h-64 md:h-80 max-w-lg relative mb-xl animate-fade-in-up">
          <SecureCoreHero />
        </div>
        <div className="z-10 max-w-md animate-fade-in-up">
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-md">Secure Channel Ready</h2>
          <p className="text-body-lg text-on-surface-variant">
            Select a conversation from the sidebar to start messaging. All data remains end-to-end encrypted.
          </p>
        </div>
      </div>
    );
  }

  const config = configs[type] || configs.noConversations;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
        <Icon name={config.icon} className="text-primary text-[32px]" />
      </div>
      <h3 className="text-lg md:text-xl font-semibold text-on-surface mb-2">{config.title}</h3>
      <p className="text-sm md:text-base text-on-surface-variant max-w-sm mb-6">{config.description}</p>
      {config.actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-semibold rounded-lg transition-colors min-h-[40px]"
        >
          <Icon name={config.actionIcon} className="text-[20px]" />
          {config.actionLabel}
        </button>
      )}
    </div>
  );
};
