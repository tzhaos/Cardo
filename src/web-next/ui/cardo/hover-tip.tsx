/**
 * Product hover tip — speech-bubble label above/beside chrome controls.
 * Built on Radix Tooltip; visuals live in design-system `.cardo-hover-tip`.
 */

import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { cn } from '../lib/cn';

export type HoverTipSide = 'top' | 'right' | 'bottom' | 'left';

export interface HoverTipProps {
  /** Tip label (short product copy). */
  label: ReactNode;
  /** Control that receives hover / focus. Must accept a ref (asChild). */
  children: ReactElement;
  side?: HoverTipSide;
  sideOffset?: number;
  /** Open delay in ms; product chrome prefers a short delay. */
  delayDuration?: number;
  contentClassName?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Wraps a single control with Cardo speech-bubble hover tip.
 * Prefer this over raw Tooltip for toolbar / icon chrome.
 */
export function HoverTip({
  label,
  children,
  side = 'top',
  sideOffset = 8,
  delayDuration,
  contentClassName,
  open,
  defaultOpen,
  onOpenChange,
}: HoverTipProps) {
  return (
    <Tooltip
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
    >
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={sideOffset}
        className={cn('cardo-hover-tip', contentClassName)}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/** Re-export content props for advanced placements that compose primitives. */
export type HoverTipContentProps = ComponentProps<typeof TooltipContent>;
