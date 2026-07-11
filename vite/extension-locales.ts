export const EXTENSION_LOCALE_CODES = {
  en: 'en',
  zh: 'zh_CN',
} as const;

export const EXTENSION_LOCALE_MESSAGES = {
  en: {
    extensionName: { message: 'KhaosBox' },
    extensionShortName: { message: 'KhaosBox' },
    extensionDescription: {
      message: 'A new tab workspace for organizing links, notes, files, and folders.',
    },
  },
  zh: {
    extensionName: { message: 'KhaosBox' },
    extensionShortName: { message: 'KhaosBox' },
    extensionDescription: {
      message: '一个用于整理链接、笔记、文件和文件夹的新标签页工作区。',
    },
  },
} as const satisfies Record<
  keyof typeof EXTENSION_LOCALE_CODES,
  Record<string, { message: string }>
>;
