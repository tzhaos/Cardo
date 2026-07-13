import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../internal/lib/cn';

export interface KitSwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  type = 'button',
  ...props
}: KitSwitchProps) {
  return (
    <button
      data-slot="kit-switch"
      data-cardo-ui="switch"
      type={type}
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      className={cn('cardo-switch', className)}
      onClick={() => {
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      {...props}
    >
      <span className="cardo-switch-thumb" aria-hidden="true" />
    </button>
  );
}
