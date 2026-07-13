import type { BoxItem } from './workspace';

export function getItemResultTitle(item: BoxItem) {
  if (item.title.trim()) return item.title.trim();
  if (item.type === 'clipboard') return createExcerpt(item.text, 48);
  return item.type === 'bookmark' ? item.url : item.path;
}

export function getItemDetail(item: BoxItem) {
  if (item.type === 'clipboard') return createExcerpt(item.text, 120);
  if (item.type === 'bookmark') return item.url;
  return item.path;
}

function createExcerpt(value: string, maximumLength: number) {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > maximumLength ? `${compact.slice(0, maximumLength).trimEnd()}…` : compact;
}
