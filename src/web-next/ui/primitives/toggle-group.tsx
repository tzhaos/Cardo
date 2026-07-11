import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function ToggleGroup({
  className,
  variant = 'segmented',
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: 'plain' | 'segmented';
}) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(variant === 'segmented' && 'wbn-segmented-control', className)}
      {...props}
    />
  );
}

export function ToggleGroupItem({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn('wbn-ui-toggle-group-item', className)}
      {...props}
    />
  );
}
