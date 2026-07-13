import { forwardRef, type ComponentProps } from 'react';
import { cn } from '../internal/lib/cn';

export type KitTextareaProps = ComponentProps<'textarea'>;

export const Textarea = forwardRef<HTMLTextAreaElement, KitTextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      data-slot="kit-textarea"
      data-cardo-ui="textarea"
      className={cn('cardo-input', 'cardo-textarea', className)}
      {...props}
    />
  );
});
