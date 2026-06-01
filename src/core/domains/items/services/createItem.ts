import type { ItemDraft, ItemType } from '../model/item';
import { createWorkspaceItem } from '../model/item';
import { parseTextToItemDraft } from './parseTextToItemDraft';

interface CreateItemInput {
  type: ItemType;
  content: string;
  title?: string;
}

export function createItem({ type, content, title }: CreateItemInput) {
  return createWorkspaceItem(
    `legacy-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    {
      type,
      content,
      title,
    },
  );
}

export function createItemFromText(text: string): ItemDraft {
  return parseTextToItemDraft(text);
}
