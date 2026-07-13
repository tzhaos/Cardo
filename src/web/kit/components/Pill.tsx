import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../internal/lib/cn';

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ghost?: boolean;
  trailing?: ReactNode;
}

/** Gray pill trigger (dropdowns, secondary actions). */
export function Pill({
  className,
  ghost,
  trailing,
  children,
  type = 'button',
  ...props
}: PillProps) {
  return (
    <button
      type={type}
      data-cardo-ui="pill"
      className={cn('cardo-pill', ghost && 'cardo-pill-ghost', className)}
      {...props}
    >
      {children}
      {trailing}
    </button>
  );
}
