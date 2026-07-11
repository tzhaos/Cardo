import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const buttonVariants = cva('cardo-ui-button', {
  variants: {
    variant: {
      default: 'cardo-ui-button-default',
      ghost: 'cardo-ui-button-ghost',
      danger: 'cardo-ui-button-danger',
      card: 'cardo-ui-button-card',
      icon: 'cardo-icon-button',
    },
    size: {
      default: 'cardo-ui-button-size-default',
      compact: 'cardo-ui-button-size-compact',
      icon: 'cardo-ui-button-size-icon',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Source-owned shadcn-style button primitive. Product geometry and colors are
 * supplied by Cardo semantic classes instead of shadcn's default theme.
 */
export function Button({
  asChild = false,
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      type={type}
      {...props}
    />
  );
}
