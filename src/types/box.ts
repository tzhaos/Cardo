import { BoxItemData } from './item';

export type { BoxItemData };
export type BoxLayout = 'grid' | 'list';
export type SystemBoxRole = 'folders' | 'links' | 'notes';

export interface BoxData {
  id: string;
  role?: SystemBoxRole | null;
  title: string;
  titleKey?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  theme: string; // color class
  isLocked: boolean;
  isMinimized: boolean;
  layout: BoxLayout;
  items: BoxItemData[];
  zIndex: number;
}
