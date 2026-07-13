import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../internal/lib/cn';

/**
 * Product button variants.
 * Includes legacy aliases (default/card/icon) so SettingsPanel can migrate without churn.
 */
const kitButtonVariants = cva('cardo-button', {
  variants: {
    variant: {
      primary: 'cardo-button-primary',
      secondary: 'cardo-button-secondary',
      /** @deprecated alias of secondary — settings migration */
      default: 'cardo-button-secondary',
      ghost: 'cardo-button-ghost',
      danger: 'cardo-button-danger',
      create: 'cardo-button-create',
      card: 'cardo-button-secondary',
      icon: 'cardo-button-ghost cardo-button-size-icon',
    },
    size: {
      md: 'cardo-button-size-md',
      sm: 'cardo-button-size-sm',
      default: 'cardo-button-size-md',
      compact: 'cardo-button-size-sm',
      icon: 'cardo-button-size-icon',
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'md',
  },
});

export interface KitButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof kitButtonVariants> {
  asChild?: boolean;
}

export function Button({
  asChild = false,
  className,
  variant,
  size,
  type = 'button',
  ...props
}: KitButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      data-slot="kit-button"
      data-cardo-ui="button"
      type={type}
      className={cn(kitButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { kitButtonVariants };
