import type { ItemDraft } from '../model/item';
import { parseTextToItemDraft } from './parseTextToItemDraft';

function getUriListEntries(dataTransfer: DataTransfer) {
  return dataTransfer
    .getData('text/uri-list')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry && !entry.startsWith('#'));
}

export function parseDataTransferToTextDraft(dataTransfer: DataTransfer): ItemDraft | null {
  const urlData = getUriListEntries(dataTransfer)[0];

  if (urlData) {
    return parseTextToItemDraft(urlData);
  }

  const textData = dataTransfer.getData('text/plain') || dataTransfer.getData('text');

  if (!textData) {
    return null;
  }

  return parseTextToItemDraft(textData);
}
