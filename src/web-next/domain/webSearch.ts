import type { WebSearchEngineId } from '../../core/contracts/preferences';

export type { WebSearchEngineId } from '../../core/contracts/preferences';

export const DEFAULT_WEB_SEARCH_ENGINE: WebSearchEngineId = 'bing-cn';

const SEARCH_URL_TEMPLATES: Record<Exclude<WebSearchEngineId, 'custom'>, string> = {
  'bing-cn': 'https://cn.bing.com/search?q={query}',
  bing: 'https://www.bing.com/search?q={query}',
  baidu: 'https://www.baidu.com/s?wd={query}',
  google: 'https://www.google.com/search?q={query}',
};

export function isValidCustomSearchTemplate(template: string) {
  if (!template.includes('{query}')) return false;
  try {
    const url = new URL(template.replaceAll('{query}', 'khaosbox'));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createWebSearchUrl(
  engine: WebSearchEngineId,
  customTemplate: string,
  query: string,
) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  const template =
    engine === 'custom'
      ? isValidCustomSearchTemplate(customTemplate)
        ? customTemplate
        : null
      : SEARCH_URL_TEMPLATES[engine];

  return template?.replaceAll('{query}', encodeURIComponent(normalizedQuery)) ?? null;
}
