import type { BoxData } from '../../../types/box';
import { DEFAULT_SYSTEM_BOX_TITLES } from './boxTitles';

export const DEFAULT_BOX_THEME = 'bg-zinc-900/90 border-zinc-700';

export function createInitialBoxes(): BoxData[] {
  return [
    {
      id: 'folders',
      title: DEFAULT_SYSTEM_BOX_TITLES.folders,
      titleKey: null,
      x: 100,
      y: 100,
      width: 320,
      height: 400,
      theme: DEFAULT_BOX_THEME,
      isLocked: false,
      isMinimized: false,
      layout: 'grid',
      zIndex: 10,
      items: [],
    },
    {
      id: 'webpages',
      title: DEFAULT_SYSTEM_BOX_TITLES.webpages,
      titleKey: null,
      x: 450,
      y: 100,
      width: 320,
      height: 400,
      theme: DEFAULT_BOX_THEME,
      isLocked: false,
      isMinimized: false,
      layout: 'list',
      zIndex: 11,
      items: [],
    },
    {
      id: 'clipboard',
      title: DEFAULT_SYSTEM_BOX_TITLES.clipboard,
      titleKey: null,
      x: 800,
      y: 100,
      width: 320,
      height: 400,
      theme: DEFAULT_BOX_THEME,
      isLocked: false,
      isMinimized: false,
      layout: 'list',
      zIndex: 12,
      items: [],
    },
  ];
}

export function getMaxZIndex(boxes: BoxData[]) {
  return boxes.reduce((max, box) => Math.max(max, box.zIndex), 0);
}
