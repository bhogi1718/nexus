import React from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { TextField } from '../ui/TextField';

export const AddContactForm = ({ contactEmail, setContactEmail, addingContact, contactMessage, onSubmit }) => {
  // The hook prefixes success messages with a check mark.
  const isSuccess = contactMessage?.startsWith('✓');
  const message = isSuccess ? contactMessage.replace(/^✓\s*/, '') : contactMessage;

  return (
    <div>
      <form onSubmit={onSubmit} className="flex gap-sm items-start">
        <TextField
          type="email"
          icon="alternate_email"
          placeholder="name@example.com"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          aria-label="Contact email address"
          autoComplete="off"
          containerClassName="flex-1"
        />
        <Button type="submit" loading={addingContact} disabled={!contactEmail.trim()} icon="add">
          Add
        </Button>
      </form>

      {contactMessage && (
        <p
          role="status"
          className={`mt-sm text-body-sm flex items-center gap-1 animate-fade-in ${isSuccess ? 'text-success' : 'text-danger'}`}
        >
          <Icon name={isSuccess ? 'check_circle' : 'error'} className="text-[16px]" />
          {message}
        </p>
      )}
    </div>
  );
};
