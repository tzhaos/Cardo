import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
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

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = barRef.current;
    if (!root) return;
    const dangerButton = root.querySelector<HTMLButtonElement>('button.cardo-button-danger');
    const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const prefer = dangerButton ?? focusables[focusables.length - 1] ?? focusables[0];
    prefer?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const root = barRef.current;
    if (!root) return;
    const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={barRef}
      role="alertdialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-cardo-ui="confirm-bar"
      className={cn('cardo-confirm-bar', className)}
      onKeyDown={onKeyDown}
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
