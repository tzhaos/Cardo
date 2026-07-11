import { forwardRef } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { motion } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';
import { buttonVariants } from './button';
import { cn } from '../lib/cn';

export interface MotionButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'ref'>,
    VariantProps<typeof buttonVariants> {}

/**
 * Motion-aware counterpart of the source-owned Button primitive. Keeping the
 * variant contract here prevents animated controls from bypassing the design
 * system while preserving their existing interaction animation props.
 */
export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <motion.button
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      type={type}
      {...props}
    />
  ),
);

MotionButton.displayName = 'MotionButton';
