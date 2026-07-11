import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Button } from '../primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { cn } from '../lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tooltip?: ReactNode;
}

function IconButtonControl({
  children,
  className,
  type = 'button',
  ...props
}: Omit<IconButtonProps, 'tooltip'>) {
  return (
    <Button asChild variant="icon" size="icon" className={className} type={type}>
      <motion.button
        {...props}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.45 }}
      >
        {children}
      </motion.button>
    </Button>
  );
}

export function IconButton({ tooltip, ...props }: IconButtonProps) {
  if (!tooltip) {
    return <IconButtonControl {...props} />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButtonControl {...props} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function IconFrame({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span {...props} className={cn('wbn-icon-frame', className)}>
      {children}
    </span>
  );
}
