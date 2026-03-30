import type { ItemType } from '../../../types/item';

export function deriveItemTitle(type: ItemType, content: string) {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    return 'Untitled';
  }

  if (type === 'url') {
    return normalizedContent.replace(/^https?:\/\//i, '').split('/')[0] || 'Link';
  }

  if (type === 'note') {
    return normalizedContent.slice(0, 20) + (normalizedContent.length > 20 ? '...' : '');
  }

  return normalizedContent.split(/[/\\]/).pop() || `New ${type}`;
}
