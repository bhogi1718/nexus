import React from 'react';
import { Icon } from '../ui/Icon';

export const MobileTabBar = ({ activeTab, onSelectChats, onSelectContacts, onSelectProfile }) => {
  const tabClass = (tab) =>
    `flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-full transition-all ${
      activeTab === tab ? 'bg-secondary-container text-on-secondary-container scale-95' : 'text-on-surface-variant'
    }`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest border-t border-outline-variant flex justify-around items-center px-4 py-2 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <button onClick={onSelectChats} className={tabClass('chats')}>
        <Icon name="message" filled={activeTab === 'chats'} className="text-[22px]" />
        <span className="font-label-caps text-label-caps">Chats</span>
      </button>
      <button onClick={onSelectContacts} className={tabClass('contacts')}>
        <Icon name="contacts" filled={activeTab === 'contacts'} className="text-[22px]" />
        <span className="font-label-caps text-label-caps">Contacts</span>
      </button>
      <button onClick={onSelectProfile} className={tabClass('profile')}>
        <Icon name="account_circle" filled={activeTab === 'profile'} className="text-[22px]" />
        <span className="font-label-caps text-label-caps">Profile</span>
      </button>
    </div>
  );
};
