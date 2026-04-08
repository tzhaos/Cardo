import type { ItemDraft, ItemType } from '../../domains/items/model/item';
import type { ToastSpec } from '../presentation/toastSpec';
import { readClipboardItem } from './readClipboardItem';

export type PrepareAddItemTypeResult =
  | { outcome: 'clipboard'; item: ItemDraft; toast: ToastSpec }
  | { outcome: 'compose'; type: ItemType };

export async function prepareAddItemTypeSelection(type: ItemType): Promise<PrepareAddItemTypeResult> {
  if (type === 'note') {
    const clipboardItem = await readClipboardItem();

    if (clipboardItem) {
      return {
        outcome: 'clipboard',
        item: clipboardItem,
        toast: { level: 'success', messageKey: 'toast.addedFromClipboard' },
      };
    }
  }

  return { outcome: 'compose', type };
}
