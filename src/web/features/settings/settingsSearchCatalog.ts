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
    keywords: {
      en: ['bing', 'google', 'baidu', 'web search'],
      zh: ['搜索引擎', '必应', '百度', '谷歌'],
    },
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
    keywords: { en: ['codex', 'theme', 'pack'], zh: ['codex', '主题', '主题包'] },
  },
  {
    id: 'mode',
    section: 'appearance',
    titleKey: 'settings.mode',
    descriptionKey: 'settings.modeDescription',
    keywords: { en: ['light', 'dark', 'night'], zh: ['浅色', '深色', '暗色', '夜间'] },
  },
  {
    id: 'font-family',
    section: 'appearance',
    titleKey: 'settings.fontFamily',
    descriptionKey: 'settings.fontFamilyDescription',
    keywords: { en: ['typeface', 'typography', 'serif'], zh: ['字体', '衬线', '系统字体'] },
  },
  {
    id: 'font-scale',
    section: 'appearance',
    titleKey: 'settings.fontScale',
    descriptionKey: 'settings.fontScaleDescription',
    keywords: { en: ['text size', 'type scale'], zh: ['字号', '文字大小', '缩放'] },
  },
  {
    id: 'density',
    section: 'appearance',
    titleKey: 'settings.density',
    descriptionKey: 'settings.densityDescription',
    keywords: { en: ['spacing', 'compact', 'spacious'], zh: ['密度', '间距', '紧凑', '宽松'] },
  },
  {
    id: 'css-snippet',
    section: 'appearance',
    titleKey: 'settings.cssSnippet',
    descriptionKey: 'settings.cssSnippetDescription',
    keywords: { en: ['css', 'custom style', 'advanced'], zh: ['css', '自定义样式', '高级'] },
  },
  {
    id: 'workspace-backup',
    section: 'data',
    titleKey: 'settings.workspaceBackup',
    descriptionKey: 'settings.workspaceBackupDescription',
    keywords: {
      en: ['backup', 'workspace', 'import', 'export'],
      zh: ['备份', '工作区', '导入', '导出'],
    },
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
    id: 'operation-log',
    section: 'data',
    titleKey: 'settings.operationLog',
    descriptionKey: 'settings.operationLogDescription',
    keywords: { en: ['history', 'operations', 'audit'], zh: ['操作日志', '历史', '审计'] },
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
  {
    id: 'about-version',
    section: 'about',
    titleKey: 'settings.version',
    descriptionKey: 'settings.aboutDescription',
    keywords: { en: ['version', 'release', 'semver', 'build'], zh: ['版本', '版本号', '发行'] },
  },
  {
    id: 'about-update',
    section: 'about',
    titleKey: 'settings.update',
    descriptionKey: 'settings.updateDescription',
    keywords: {
      en: ['update', 'upgrade', 'download', 'install', 'github'],
      zh: ['更新', '升级', '下载', '安装', '检查更新'],
    },
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
