import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { HoverTip, type HoverTipSide } from '../internal/system/hover-tip';
import { cn } from '../internal/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Product HoverTip (not native title). */
  tooltip?: ReactNode;
  tooltipSide?: HoverTipSide;
  /** Pressed / selected chrome (e.g. canvas lock). */
  pressed?: boolean;
}

/**
 * Kit icon button — opacity/color only, no Motion scale (Agents: small glyphs).
 */
const IconButtonControl = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, 'tooltip' | 'tooltipSide'>
>(function IconButtonControl({ children, className, type = 'button', pressed, ...props }, ref) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      data-cardo-ui="icon-button"
      data-slot="kit-icon-button"
      data-pressed={pressed ? 'true' : undefined}
      aria-pressed={pressed}
      className={cn(
        'cardo-button',
        'cardo-button-size-icon',
        'cardo-button-ghost',
        pressed && 'cardo-icon-button-pressed',
        className,
      )}
    >
      {children}
    </button>
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
}: ButtonHTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span {...props} className={cn('cardo-icon-frame', className)}>
      {children}
    </span>
  );
}
