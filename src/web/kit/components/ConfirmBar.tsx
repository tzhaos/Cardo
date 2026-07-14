import type { ReactNode } from 'react';
import { cn } from '../internal/lib/cn';
import { Button } from './Button';

export interface ConfirmBarProps {
  message: ReactNode;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Compact confirm strip (page delete, destructive actions). */
export function ConfirmBar({
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  danger = true,
  className,
  'aria-label': ariaLabel,
}: ConfirmBarProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-cardo-ui="confirm-bar"
      className={cn('cardo-confirm-bar', className)}
    >
      <div className="cardo-confirm-bar-message">{message}</div>
      <div className="cardo-confirm-bar-actions">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
