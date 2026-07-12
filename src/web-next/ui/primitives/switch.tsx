import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Accessible binary switch (role=switch). Product paint lives in settings.css /
 * theme recipes via .cardo-ui-switch.
 */
export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  type = 'button',
  ...props
}: SwitchProps) {
  return (
    <button
      data-slot="switch"
      type={type}
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      className={cn('cardo-ui-switch', className)}
      onClick={() => {
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      {...props}
    >
      <span className="cardo-ui-switch-thumb" aria-hidden="true" />
    </button>
  );
}
