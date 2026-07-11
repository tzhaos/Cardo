import type { PreferenceLocale } from '../contracts/preferences';

export interface WelcomeSeedCopy {
  boxTitle: string;
  tips: string[];
}

const WELCOME_COPY: Record<PreferenceLocale, WelcomeSeedCopy> = {
  zh: {
    boxTitle: '初次见面',
    tips: [
      '你好，欢迎来到 Cardo。这里用「盒子」收纳内容，用「页面」整理不同工作区。',
      '选中一个盒子后粘贴文字、网址或本地路径，会自动放进该盒子；没有选中时，会在画面中间新建一个临时盒。',
      '拖动盒子标题栏可以移动位置，拖边角可以调整大小。标题栏还能切换列表/网格、锁定位置，以及自定义图标和颜色。',
      '底部工具栏可以新建盒子；顶部可以新建页面，也能打开收藏和回收站。',
      '点击剪贴板条目可复制文字，书签和本地资源可直接打开；右键可以编辑、置顶或删除。',
    ],
  },
  en: {
    boxTitle: 'Hello',
    tips: [
      'Welcome to Cardo. Use boxes to collect things, and pages to organize different workspaces.',
      'Select a box and paste text, a URL, or a local path to add it. With nothing selected, paste creates a temporary box in the center.',
      'Drag a box by its title bar to move it, or drag a corner to resize. Header controls cover list/grid, lock, and appearance.',
      'Create a new box from the bottom toolbar. Use the top bar for pages, Favorites, and the Recycle Bin.',
      'Click a clipboard item to copy it, or open bookmarks and local files. Right-click to edit, pin, or delete.',
    ],
  },
};

export function getWelcomeSeedCopy(locale: PreferenceLocale): WelcomeSeedCopy {
  return WELCOME_COPY[locale] ?? WELCOME_COPY.en;
}
