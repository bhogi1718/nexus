import React from 'react';
import { Icon } from '../ui/Icon';

export const AddContactForm = ({ contactEmail, setContactEmail, addingContact, contactMessage, onSubmit }) => (
  <div className="space-y-2">
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="email"
        placeholder="Add contact..."
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        className="flex-1 px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-surface-container-high text-on-surface placeholder:text-outline text-sm"
      />
      <button
        type="submit"
        disabled={addingContact || !contactEmail.trim()}
        className="px-3 py-2 bg-primary-container hover:bg-primary-container/90 disabled:bg-outline-variant text-on-primary-container font-bold rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
      >
        <Icon name="add" className="text-[20px]" />
      </button>
    </form>
    {contactMessage && (
      <p className={`text-xs ${contactMessage.startsWith('✓') ? 'text-primary' : 'text-error'}`}>
        {contactMessage}
      </p>
    )}
  </div>
);
