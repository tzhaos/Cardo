import type { ItemDraft, ItemType } from '../../../domains/items/model/item';

export function createExternalDraftFromTransfer(dataTransfer: DataTransfer): ItemDraft | null {
  for (const transferItem of Array.from(dataTransfer.items)) {
    if (transferItem.kind !== 'file') {
      continue;
    }

    const entry = transferItem.webkitGetAsEntry?.();

    if (entry?.isDirectory) {
      return {
        type: 'folder',
        title: entry.name,
        content: '',
      };
    }

    const file = transferItem.getAsFile();

    if (file) {
      return {
        type: 'file',
        title: file.name,
        content: '',
      };
    }
  }

  return null;
}
