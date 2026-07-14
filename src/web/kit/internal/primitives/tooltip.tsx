import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function TooltipProvider({
  delayDuration = 320,
  skipDelayDuration = 120,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

export function Tooltip({ delayDuration, ...props }: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" delayDuration={delayDuration} {...props} />;
}

export function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export function TooltipContent({
  className,
  side = 'top',
  sideOffset = 8,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        side={side}
        sideOffset={sideOffset}
        className={cn('cardo-tooltip-content cardo-hover-tip', className)}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          className="cardo-tooltip-arrow cardo-hover-tip-arrow"
          width={12}
          height={7}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
