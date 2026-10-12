import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Icon } from './Icon';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    label={title}
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </>
    }
  >
    <div className="flex gap-md pt-xs">
      <span className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
        ${danger ? 'bg-danger-subtle text-danger' : 'bg-surface-accent text-content-secondary'}`}>
        <Icon name={danger ? 'warning' : 'help'} className="text-[22px]" />
      </span>
      <div className="min-w-0">
        <h2 className="text-title-md text-content mb-1">{title}</h2>
        <p className="text-body-md text-content-secondary text-pretty">{message}</p>
      </div>
    </div>
  </Modal>
);
