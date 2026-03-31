import { ITEM_TYPE_LABEL_KEYS } from '../../i18n/model/messages';
import { translate } from '../../i18n/services/translate';
import type { ItemType } from '../../../types/item';

export function deriveItemTitle(type: ItemType, content: string) {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    return translate('item.untitled');
  }

  if (type === 'url') {
    return normalizedContent.replace(/^https?:\/\//i, '').split('/')[0] || translate('item.linkFallback');
  }

  if (type === 'note') {
    return normalizedContent.slice(0, 20) + (normalizedContent.length > 20 ? '...' : '');
  }

  return (
    normalizedContent.split(/[/\\]/).pop() ||
    translate('item.newType', {
      type: translate(ITEM_TYPE_LABEL_KEYS[type]),
    })
  );
}
