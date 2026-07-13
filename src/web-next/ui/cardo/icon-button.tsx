import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import type { HTMLMotionProps } from 'motion/react';
import { MotionButton } from '../primitives/motion-button';
import { HoverTip, type HoverTipSide } from './hover-tip';
import { cn } from '../lib/cn';

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  /** Speech-bubble hover tip label (Cardo HoverTip). */
  tooltip?: ReactNode;
  tooltipSide?: HoverTipSide;
}

const IconButtonControl = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, 'tooltip' | 'tooltipSide'>
>(function IconButtonControl({ children, className, type = 'button', ...props }, ref) {
  return (
    <MotionButton
      {...props}
      ref={ref}
      variant="icon"
      size="icon"
      className={className}
      type={type}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.45 }}
    >
      {children}
    </MotionButton>
  );
});

export function IconButton({ tooltip, tooltipSide = 'top', ...props }: IconButtonProps) {
  if (!tooltip) {
    return <IconButtonControl {...props} />;
  }

  return (
    <HoverTip label={tooltip} side={tooltipSide}>
      <IconButtonControl {...props} />
    </HoverTip>
  );
}

export function IconFrame({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span {...props} className={cn('cardo-icon-frame', className)}>
      {children}
    </span>
  );
}
