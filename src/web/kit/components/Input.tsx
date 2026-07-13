import { forwardRef, type ComponentProps } from 'react';
import { cn } from '../internal/lib/cn';

export type KitInputProps = ComponentProps<'input'>;

export const Input = forwardRef<HTMLInputElement, KitInputProps>(function Input(
  { className, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      data-slot="kit-input"
      data-cardo-ui="input"
      type={type}
      className={cn('cardo-input', className)}
      {...props}
    />
  );
});
