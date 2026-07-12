import type { WebNextMessageKey } from '../../i18n/messages';

export type SettingsSectionId = 'general' | 'appearance' | 'data' | 'about';

export interface SettingsSearchEntry {
  id: string;
  section: SettingsSectionId;
  titleKey: WebNextMessageKey;
  descriptionKey?: WebNextMessageKey;
  /** Extra en/zh keywords for fuzzy match beyond title/description. */
  keywords?: { en: string[]; zh: string[] };
}

/** Indexed settings rows for in-panel search. */
export const SETTINGS_SEARCH_CATALOG: readonly SettingsSearchEntry[] = [
  {
    id: 'language',
    section: 'general',
    titleKey: 'settings.language',
    descriptionKey: 'settings.languageDescription',
    keywords: { en: ['locale', 'chinese', 'english'], zh: ['中文', '英文', '界面语言'] },
  },
  {
    id: 'search-engine',
    section: 'general',
    titleKey: 'settings.searchEngine',
    descriptionKey: 'settings.searchEngineDescription',
    keywords: { en: ['bing', 'google', 'baidu', 'web search'], zh: ['搜索引擎', '必应', '百度', '谷歌'] },
  },
  {
    id: 'features',
    section: 'general',
    titleKey: 'settings.features',
    descriptionKey: 'settings.featuresDescription',
    keywords: {
      en: ['toggle', 'chrome', 'catalog', 'multi page', 'recycle', 'collection'],
      zh: ['开关', '功能', '多页面', '回收站', '收藏', '顶栏', '底栏'],
    },
  },
  {
    id: 'theme',
    section: 'appearance',
    titleKey: 'settings.theme',
    descriptionKey: 'settings.themeDescription',
    keywords: { en: ['classic', 'fluent', 'pack'], zh: ['经典', 'fluent', '主题包'] },
  },
  {
    id: 'mode',
    section: 'appearance',
    titleKey: 'settings.mode',
    descriptionKey: 'settings.modeDescription',
    keywords: { en: ['light', 'dark', 'night'], zh: ['浅色', '深色', '暗色', '夜间'] },
  },
  {
    id: 'theme-looks',
    section: 'appearance',
    titleKey: 'settings.themeLooks',
    descriptionKey: 'settings.themeLooksDescription',
    keywords: { en: ['look', 'palette', 'preset'], zh: ['配色', '预设', '色板'] },
  },
  {
    id: 'color-overrides',
    section: 'appearance',
    titleKey: 'settings.colorOverrides',
    descriptionKey: 'settings.colorOverridesDescription',
    keywords: { en: ['accent', 'custom', 'token'], zh: ['强调色', '自定义', '颜色'] },
  },
  {
    id: 'settings-chrome',
    section: 'appearance',
    titleKey: 'settings.colorOverride.settingsChrome',
    keywords: { en: ['settings background', 'panel'], zh: ['设置背景', '面板底色'] },
  },
  {
    id: 'settings-hover',
    section: 'appearance',
    titleKey: 'settings.colorOverride.settingsHover',
    keywords: { en: ['settings hover', 'row hover'], zh: ['悬停', 'hover'] },
  },
  {
    id: 'reset-colors',
    section: 'appearance',
    titleKey: 'settings.resetColorOverrides',
    descriptionKey: 'settings.resetColorOverridesDescription',
    keywords: { en: ['restore', 'default colors'], zh: ['恢复默认', '重置颜色'] },
  },
  {
    id: 'export-data',
    section: 'data',
    titleKey: 'settings.exportData',
    descriptionKey: 'settings.exportDataDescription',
    keywords: { en: ['backup', 'download json'], zh: ['备份', '导出', '下载'] },
  },
  {
    id: 'import-data',
    section: 'data',
    titleKey: 'settings.importData',
    descriptionKey: 'settings.importDataDescription',
    keywords: { en: ['restore', 'upload json'], zh: ['导入', '恢复', '上传'] },
  },
  {
    id: 'export-log',
    section: 'data',
    titleKey: 'settings.exportLog',
    descriptionKey: 'settings.exportLogDescription',
    keywords: { en: ['history', 'operations'], zh: ['操作日志', '历史'] },
  },
  {
    id: 'about',
    section: 'about',
    titleKey: 'settings.about',
    descriptionKey: 'settings.aboutDescription',
    keywords: { en: ['version', 'cardo', 'edition'], zh: ['关于', '版本', '产品'] },
  },
];

export function matchSettingsSearchEntries(
  query: string,
  locale: 'en' | 'zh',
  translate: (key: WebNextMessageKey) => string,
): SettingsSearchEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return SETTINGS_SEARCH_CATALOG.filter((entry) => {
    const title = translate(entry.titleKey).toLowerCase();
    const description = entry.descriptionKey ? translate(entry.descriptionKey).toLowerCase() : '';
    const keywords = (entry.keywords?.[locale] ?? []).join(' ').toLowerCase();
    const enKeywords = (entry.keywords?.en ?? []).join(' ').toLowerCase();
    return (
      title.includes(normalized) ||
      description.includes(normalized) ||
      keywords.includes(normalized) ||
      enKeywords.includes(normalized) ||
      entry.section.includes(normalized)
    );
  });
}
