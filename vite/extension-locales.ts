export const EXTENSION_LOCALE_CODES = {
  en: 'en',
  zh: 'zh_CN',
} as const;

export const EXTENSION_LOCALE_MESSAGES = {
  en: {
    extensionName: { message: 'Cardo' },
    extensionShortName: { message: 'Cardo' },
    extensionDescription: {
      message:
        'Browser client for the local Cardo Runtime workspace. Open from the toolbar; requires Cardo Desktop or CLI.',
    },
    extensionActionTitle: { message: 'Open Cardo' },
  },
  zh: {
    extensionName: { message: 'Cardo' },
    extensionShortName: { message: 'Cardo' },
    extensionDescription: {
      message: '本机 Cardo Runtime 的浏览器客户端。通过工具栏打开；需要 Cardo Desktop 或 CLI。',
    },
    extensionActionTitle: { message: '打开 Cardo' },
  },
} as const satisfies Record<
  keyof typeof EXTENSION_LOCALE_CODES,
  Record<string, { message: string }>
>;
