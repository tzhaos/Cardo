import type { ReactNode } from 'react';

export interface FloatingMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
  children?: FloatingMenuItem[];
  onSelect?: () => void;
}

export interface FloatingMenuState {
  id: string;
  x: number;
  y: number;
  items: FloatingMenuItem[];
}
