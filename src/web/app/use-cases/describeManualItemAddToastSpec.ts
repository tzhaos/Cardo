import type { ItemType } from '../../../core/domains/items/model/item';
import { ITEM_TYPE_LABEL_KEYS } from '../../../core/domains/i18n/model/messages';
import type { ToastSpec } from '../presentation/toastSpec';

export function describeManualItemAddToastSpec(addingType: ItemType): ToastSpec {
  return {
    level: 'success',
    messageKey: 'toast.addedNewType',
    params: { type: { i18nKey: ITEM_TYPE_LABEL_KEYS[addingType] } },
  };
}
