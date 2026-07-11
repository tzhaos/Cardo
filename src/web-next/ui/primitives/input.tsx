import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input data-slot="input" type={type} className={cn('cardo-ui-input', className)} {...props} />
  );
}
