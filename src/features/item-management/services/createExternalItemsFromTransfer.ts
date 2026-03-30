import type { BoxItemData } from '../../../types/box';
import { createItem, createItemFromText } from '../../../domains/items/services/createItem';
import { isUrlText } from '../../../domains/items/services/isUrlText';

export function createExternalItemsFromTransfer(dataTransfer: DataTransfer) {
  const transferItems = Array.from(dataTransfer.items);
  const items: BoxItemData[] = [];

  for (const transferItem of transferItems) {
    if (transferItem.kind !== 'file') {
      continue;
    }

    const entry = transferItem.webkitGetAsEntry?.();

    if (entry?.isDirectory) {
      items.push(
        createItem({
          type: 'folder',
          title: entry.name,
          content: entry.fullPath || entry.name,
        }),
      );
      continue;
    }

    const file = transferItem.getAsFile();

    if (!file) {
      continue;
    }

    items.push(
      createItem({
        type: 'file',
        title: file.name,
        content: file.webkitRelativePath || file.name,
      }),
    );
  }

  return items;
}

export function createTextItemFromTransfer(dataTransfer: DataTransfer) {
  const urlData = dataTransfer.getData('text/uri-list');

  if (urlData) {
    return createItem({
      type: 'url',
      content: urlData,
    });
  }

  const textData = dataTransfer.getData('text/plain') || dataTransfer.getData('text');

  if (!textData) {
    return null;
  }

  return isUrlText(textData) ? createItem({ type: 'url', content: textData }) : createItemFromText(textData);
}
