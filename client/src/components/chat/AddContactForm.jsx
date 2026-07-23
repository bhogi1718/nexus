import React from 'react';

export const AddContactForm = ({ contactEmail, setContactEmail, addingContact, contactMessage, onSubmit }) => (
  <div className="space-y-2">
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="email"
        placeholder="Add contact..."
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
      />
      <button
        type="submit"
        disabled={addingContact || !contactEmail.trim()}
        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
      >
        +
      </button>
    </form>
    {contactMessage && (
      <p className={`text-xs ${contactMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
        {contactMessage}
      </p>
    )}
  </div>
);
