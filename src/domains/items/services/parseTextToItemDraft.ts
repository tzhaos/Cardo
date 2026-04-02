import type { ItemDraft } from '../model/item';
import { isUrlText } from './isUrlText';
import { parseLocalPathText } from './parseLocalPathText';

export function parseTextToItemDraft(text: string): ItemDraft {
  const parsedLocalPath = parseLocalPathText(text);

  if (parsedLocalPath) {
    return {
      type: parsedLocalPath.type,
      content: parsedLocalPath.normalizedPath,
    };
  }

  return {
    type: isUrlText(text) ? 'url' : 'note',
    content: text.trim(),
  };
}
