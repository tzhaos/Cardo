import type { BoxData } from '../../../types/box';

export const DEFAULT_BOX_THEME = 'bg-zinc-900/90 border-zinc-700';

export function createInitialBoxes(): BoxData[] {
  return [
    {
      id: 'folders',
      title: 'Folders',
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
      title: 'Links',
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
      title: 'Notes',
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
