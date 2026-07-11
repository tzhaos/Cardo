import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const buttonVariants = cva('wbn-ui-button', {
  variants: {
    variant: {
      default: 'wbn-ui-button-default',
      ghost: 'wbn-ui-button-ghost',
      danger: 'wbn-ui-button-danger',
      card: 'wbn-ui-button-card',
      icon: 'wbn-icon-button',
    },
    size: {
      default: 'wbn-ui-button-size-default',
      compact: 'wbn-ui-button-size-compact',
      icon: 'wbn-ui-button-size-icon',
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
