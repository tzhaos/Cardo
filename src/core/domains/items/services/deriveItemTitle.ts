import { ITEM_TYPE_LABEL_KEYS, MESSAGES } from '../../i18n/model/messages';
import type { ItemType } from '../model/itemType';

const DEFAULT_MESSAGES = MESSAGES.en;

export function deriveItemTitle(type: ItemType, content: string) {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    return DEFAULT_MESSAGES['item.untitled'];
  }

  if (type === 'url') {
    return (
      normalizedContent.replace(/^https?:\/\//i, '').split('/')[0] ||
      DEFAULT_MESSAGES['item.linkFallback']
    );
  }

  if (type === 'note') {
    return normalizedContent.slice(0, 20) + (normalizedContent.length > 20 ? '...' : '');
  }

  return (
    normalizedContent.split(/[/\\]/).pop() ||
    DEFAULT_MESSAGES['item.newType'].replace('{type}', DEFAULT_MESSAGES[ITEM_TYPE_LABEL_KEYS[type]])
  );
}
