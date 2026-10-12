import React from 'react';
import { Icon } from '../ui/Icon';

const TABS = [
  { id: 'chats', icon: 'chat_bubble', label: 'Chats' },
  { id: 'contacts', icon: 'group', label: 'Contacts' },
  { id: 'profile', icon: 'settings', label: 'Settings' },
];

export const MobileTabBar = ({ activeTab, onSelectChats, onSelectContacts, onSelectProfile, unreadCount = 0, hidden = false }) => {
  const handlers = { chats: onSelectChats, contacts: onSelectContacts, profile: onSelectProfile };

  if (hidden) return null;

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <div role="tablist" className="flex justify-around items-stretch px-sm">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={handlers[tab.id]}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px]"
            >
              <span className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-all duration-base ease-enter
                ${active ? 'bg-surface-accent' : ''}`}>
                <Icon
                  name={tab.icon}
                  filled={active}
                  className={`text-[22px] transition-colors duration-fast ${active ? 'text-primary' : 'text-content-muted'}`}
                />
                {tab.id === 'chats' && unreadCount > 0 && (
                  <span className="absolute -top-0.5 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-content-on-primary text-[10px] font-bold flex items-center justify-center ring-2 ring-surface">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              <span className={`text-[11px] font-semibold transition-colors duration-fast ${active ? 'text-content' : 'text-content-muted'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
