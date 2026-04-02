import { deriveItemTitle } from '../services/deriveItemTitle';

export type ItemType = 'file' | 'folder' | 'url' | 'note';

export interface ItemDraft {
  type: ItemType;
  content: string;
  title?: string | null;
  isPinned?: boolean;
}

export interface WorkspaceItem {
  id: string;
  type: ItemType;
  title: string;
  content: string;
  isPinned: boolean;
}

export interface WorkspaceItemUpdate {
  title?: string;
  content?: string;
  isPinned?: boolean;
}

export function createWorkspaceItem(itemId: string, draft: ItemDraft): WorkspaceItem {
  const content = draft.content.trim();
  const title = draft.title?.trim() || deriveItemTitle(draft.type, content);

  return {
    id: itemId,
    type: draft.type,
    title,
    content,
    isPinned: draft.isPinned ?? false,
  };
}
