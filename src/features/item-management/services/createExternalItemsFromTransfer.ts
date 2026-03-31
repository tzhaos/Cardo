import { createItemFromText } from '../../../domains/items/services/createItem';

function getUriListEntries(dataTransfer: DataTransfer) {
  return dataTransfer
    .getData('text/uri-list')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry && !entry.startsWith('#'));
}

export function createTextItemFromTransfer(dataTransfer: DataTransfer) {
  const urlData = getUriListEntries(dataTransfer)[0];

  if (urlData) {
    return createItemFromText(urlData);
  }

  const textData = dataTransfer.getData('text/plain') || dataTransfer.getData('text');

  if (!textData) {
    return null;
  }

  return createItemFromText(textData);
}
