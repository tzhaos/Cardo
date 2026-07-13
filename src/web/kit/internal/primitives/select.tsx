import * as SelectPrimitive from '@radix-ui/react-select';
import type { ComponentProps } from 'react';
import { IconFrame } from '../../components/IconButton';
import { ThemeIcon } from '../icons/ThemeIcon';
import { cn } from '../lib/cn';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn('cardo-ui-select-trigger', className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <IconFrame className="cardo-ui-select-chevron">
          <ThemeIcon name="chevronDown" size={14} />
        </IconFrame>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  sideOffset = 6,
  collisionPadding = 8,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn('cardo-ui-select-content', className)}
        position={position}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        {...props}
      >
        <SelectPrimitive.Viewport className="cardo-ui-select-viewport">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn('cardo-ui-select-item', className)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator asChild>
        <IconFrame className="cardo-ui-select-check">
          <ThemeIcon name="check" size={13} strokeWidth={2.25} />
        </IconFrame>
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
