import React from 'react';
import { Icon } from './ui/Icon';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

const Action = ({ icon, label, onClick, danger = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full px-md py-3.5 min-h-[52px] text-left flex items-center gap-sm transition-colors duration-fast
      ${danger ? 'text-danger hover:bg-danger-subtle' : 'text-content hover:bg-surface-sunken'}`}
  >
    <Icon name={icon} className="text-[22px] flex-shrink-0" />
    <span className="text-title-sm">{label}</span>
  </button>
);

export const MessageContextMenu = ({ message, isCurrentUser, onClose, onDelete }) => {
  const toast = useToast();
  const canCopy = Boolean(message.content) && !message.undecryptable && !message.fileUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
    onClose();
  };

  const preview = message.fileUrl ? (message.fileName || 'Attachment') : message.content;

  return (
    <Modal isOpen onClose={onClose} padded={false} label="Message options">
      {preview && !message.undecryptable && (
        <p className="px-md pt-sm pb-3 text-body-md text-content-secondary line-clamp-3 border-b border-border">
          {preview}
        </p>
      )}
      <div className="divide-y divide-border">
        {canCopy && <Action icon="content_copy" label="Copy text" onClick={handleCopy} />}
        {isCurrentUser && <Action icon="delete" label="Delete for me" onClick={onDelete} danger />}
        <Action icon="close" label="Cancel" onClick={onClose} />
      </div>
    </Modal>
  );
};
