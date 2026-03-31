import type { ItemType } from '../../../types/item';

interface ExternalDraft {
  type: Extract<ItemType, 'file' | 'folder'>;
  title: string;
}

export function createExternalDraftFromTransfer(dataTransfer: DataTransfer): ExternalDraft | null {
  for (const transferItem of Array.from(dataTransfer.items)) {
    if (transferItem.kind !== 'file') {
      continue;
    }

    const entry = transferItem.webkitGetAsEntry?.();

    if (entry?.isDirectory) {
      return {
        type: 'folder',
        title: entry.name,
      };
    }

    const file = transferItem.getAsFile();

    if (file) {
      return {
        type: 'file',
        title: file.name,
      };
    }
  }

  return null;
}
