import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input data-slot="input" type={type} className={cn('wbn-ui-input', className)} {...props} />
  );
}
