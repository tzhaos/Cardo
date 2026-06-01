import type { ItemType } from '../../../core/domains/items/model/item';
import { ITEM_TYPE_LABEL_KEYS } from '../../../core/domains/i18n/model/messages';
import type { ToastParamValue, ToastSpec } from '../presentation/toastSpec';
import { parseDataTransferToTextDraft } from '../../../core/domains/items/services/parseDataTransferToTextDraft';
import { addItemDraftToBox } from './addItemDraftToBox';

function typeParamForDraft(draftType: ItemType): ToastParamValue {
  if (draftType === 'url') {
    return { i18nKey: 'workspace.pastedUrl' };
  }

  return { i18nKey: ITEM_TYPE_LABEL_KEYS[draftType] };
}

export function addDroppedDataTransferTextToBox(
  boxId: string,
  dataTransfer: DataTransfer,
): { added: false } | { added: true; toast: ToastSpec } {
  const textItem = parseDataTransferToTextDraft(dataTransfer);

  if (!textItem) {
    return { added: false };
  }

  addItemDraftToBox(boxId, textItem);

  return {
    added: true,
    toast: {
      level: 'success',
      messageKey: 'toast.addedType',
      params: { type: typeParamForDraft(textItem.type) },
    },
  };
}
