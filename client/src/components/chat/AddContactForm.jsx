import React from 'react';

export const AddContactForm = ({ contactEmail, setContactEmail, addingContact, contactMessage, onSubmit }) => (
  <div className="space-y-2">
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="email"
        placeholder="Add contact..."
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background text-text-primary placeholder:text-text-muted text-sm"
      />
      <button
        type="submit"
        disabled={addingContact || !contactEmail.trim()}
        className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:bg-text-muted text-white font-bold rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
      >
        +
      </button>
    </form>
    {contactMessage && (
      <p className={`text-xs ${contactMessage.startsWith('✓') ? 'text-accent' : 'text-red-600 dark:text-red-400'}`}>
        {contactMessage}
      </p>
    )}
  </div>
);
