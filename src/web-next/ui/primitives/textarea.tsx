import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn('wbn-ui-input wbn-ui-textarea', className)}
      {...props}
    />
  );
}
