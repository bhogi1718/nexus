import React, { Suspense, lazy } from 'react';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';

// three.js is ~600KB and only decorates this one state — keep it out of the
// initial bundle.
const SecureCoreHero = lazy(() =>
  import('./SecureCoreHero').then(m => ({ default: m.SecureCoreHero }))
);

const CONFIGS = {
  noConversations: {
    icon: 'forum',
    title: 'No conversations yet',
    description: 'Add a contact by email, then start a conversation with them.',
    actionLabel: 'Add a contact',
    actionIcon: 'person_add',
  },
  noMessages: {
    icon: 'waving_hand',
    title: 'Say hello',
    description: 'This is the beginning of your conversation. Messages are end-to-end encrypted, so only the two of you can read them.',
  },
  noContacts: {
    icon: 'person_add',
    title: 'No contacts yet',
    description: 'Add someone by their email address to start talking.',
  },
  noResults: {
    icon: 'search_off',
    title: 'No matches',
    description: 'No conversations or contacts match that search.',
  },
  error: {
    icon: 'error',
    title: 'Something went wrong',
    description: 'We could not load this right now. Check your connection and try again.',
    actionLabel: 'Try again',
    actionIcon: 'refresh',
  },
  offline: {
    icon: 'cloud_off',
    title: 'You are offline',
    description: 'Messages will send once your connection is back.',
  },
};

export const EmptyState = ({ type, onAction }) => {
  if (type === 'selectConversation') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-xl relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.5]"
          style={{ background: 'radial-gradient(32rem 18rem at 50% 30%, rgb(212 154 174 / 0.22), transparent 70%)' }}
        />
        <div
          className="w-full h-56 md:h-72 max-w-lg relative mb-lg animate-fade-in-up"
          style={{
            maskImage: 'radial-gradient(closest-side, #000 65%, transparent)',
            WebkitMaskImage: 'radial-gradient(closest-side, #000 65%, transparent)',
          }}
        >
          <Suspense fallback={null}>
            <SecureCoreHero />
          </Suspense>
        </div>
        <div className="z-10 max-w-md animate-fade-in-up">
          <h2 className="text-display-md font-display text-content mb-sm text-balance">
            Your conversations, kept close
          </h2>
          <p className="text-body-lg text-content-secondary text-pretty">
            Pick a conversation to pick up where you left off, or add a contact to start a new one.
          </p>
        </div>
      </div>
    );
  }

  const config = CONFIGS[type] || CONFIGS.noConversations;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-md py-2xl text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-accent flex items-center justify-center mb-md">
        <Icon name={config.icon} className="text-primary text-[30px]" />
      </div>
      <h3 className="text-title-lg font-display text-content mb-xs">{config.title}</h3>
      <p className="text-body-md text-content-secondary max-w-xs mb-lg text-pretty">{config.description}</p>
      {config.actionLabel && onAction && (
        <Button onClick={onAction} icon={config.actionIcon}>{config.actionLabel}</Button>
      )}
    </div>
  );
};
