import type { BoxItemData } from '../../../types/box';
import type { ItemType } from '../../../types/item';
import { deriveItemTitle } from './deriveItemTitle';
import { isUrlText } from './isUrlText';
import { parseLocalPathText } from './parseLocalPathText';

interface CreateItemInput {
  type: ItemType;
  content: string;
  title?: string;
  isPinned?: boolean;
}

export function createItem({ type, content, title, isPinned = false }: CreateItemInput): BoxItemData {
  const normalizedContent = content.trim();

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: title?.trim() || deriveItemTitle(type, normalizedContent),
    content: normalizedContent,
    isPinned,
  };
}

export function createItemFromText(text: string) {
  const parsedLocalPath = parseLocalPathText(text);

  if (parsedLocalPath) {
    return createItem({
      type: parsedLocalPath.type,
      content: parsedLocalPath.normalizedPath,
    });
  }

  const type: ItemType = isUrlText(text) ? 'url' : 'note';
  return createItem({ type, content: text });
}
