import { BoxItemData } from './item';

export type { BoxItemData };

export interface BoxData {
  id: string;
  title: string;
  titleKey?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  theme: string; // color class
  isLocked: boolean;
  isMinimized: boolean;
  layout: 'grid' | 'list';
  items: BoxItemData[];
  zIndex: number;
}
