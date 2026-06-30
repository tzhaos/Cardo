import { deriveItemTitle } from '../services/deriveItemTitle';
import type { ItemType } from './itemType';

export type { ItemType } from './itemType';

export interface ItemDraft {
  type: ItemType;
  content: string;
  title?: string | null;
}

interface WorkspaceItemBase {
  id: string;
  title: string;
}

export interface UrlWorkspaceItem extends WorkspaceItemBase {
  type: 'url';
  url: string;
}

export interface NoteWorkspaceItem extends WorkspaceItemBase {
  type: 'note';
  text: string;
}

export interface FileWorkspaceItem extends WorkspaceItemBase {
  type: 'file';
  path: string;
}

export interface FolderWorkspaceItem extends WorkspaceItemBase {
  type: 'folder';
  path: string;
}

export interface ShortcutWorkspaceItem extends WorkspaceItemBase {
  type: 'shortcut';
  path: string;
}

export type WorkspaceItem =
  | UrlWorkspaceItem
  | NoteWorkspaceItem
  | FileWorkspaceItem
  | FolderWorkspaceItem
  | ShortcutWorkspaceItem;

export interface WorkspaceItemUpdate {
  title?: string;
  url?: string;
  text?: string;
  path?: string;
}

export interface PlacedWorkspaceItemMeta {
  boxId: string;
  isPinned: boolean;
  columnId?: string;
}

export type PlacedWorkspaceItem = WorkspaceItem & PlacedWorkspaceItemMeta;

export function getWorkspaceItemContent(item: WorkspaceItem) {
  if (item.type === 'url') {
    return item.url;
  }

  if (item.type === 'note') {
    return item.text;
  }

  return item.path;
}

export function createWorkspaceItem(itemId: string, draft: ItemDraft): WorkspaceItem {
  const content = draft.content.trim();
  const title = draft.title?.trim() || deriveItemTitle(draft.type, content);
  const base = { id: itemId, title };

  if (draft.type === 'url') {
    return { ...base, type: 'url', url: content };
  }

  if (draft.type === 'note') {
    return { ...base, type: 'note', text: content };
  }

  if (draft.type === 'file') {
    return { ...base, type: 'file', path: content };
  }

  if (draft.type === 'folder') {
    return { ...base, type: 'folder', path: content };
  }

  return { ...base, type: 'shortcut', path: content };
}

export function updateWorkspaceItem(item: WorkspaceItem, updates: WorkspaceItemUpdate) {
  const nextTitle = updates.title ?? item.title;

  if (item.type === 'url') {
    return { ...item, title: nextTitle, url: updates.url ?? item.url };
  }

  if (item.type === 'note') {
    return { ...item, title: nextTitle, text: updates.text ?? item.text };
  }

  return { ...item, title: nextTitle, path: updates.path ?? item.path };
}
