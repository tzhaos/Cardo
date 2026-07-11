import type {
  BoxFrame,
  CollectionBoxView,
  WorkspaceBox,
  WorkspaceBoxDetailMode,
  WorkspaceBoxIcon,
  WorkspaceBoxKind,
  WorkspaceBoxPreset,
  WorkspaceBoxViewMode,
  WorkspaceItem,
  WorkspaceItemType,
  WorkspacePage,
  WorkspaceProjection,
} from '../../core/contracts/workspace';

export type {
  BoxFrame,
  CollectionBoxView,
  WorkspaceBox,
  WorkspaceBoxDetailMode,
  WorkspaceBoxIcon,
  WorkspaceBoxKind,
  WorkspaceBoxPreset,
  WorkspaceBoxViewMode,
  WorkspaceItemType,
  WorkspacePage,
  WorkspaceProjection,
};

export const RECYCLE_BIN_PAGE_ID = 'khaosbox-recycle-bin';
export const COLLECTION_PAGE_ID = 'khaosbox-collection';

export function isRecycleBinPageId(pageId: string) {
  return pageId === RECYCLE_BIN_PAGE_ID;
}

export function isCollectionPageId(pageId: string) {
  return pageId === COLLECTION_PAGE_ID;
}

export function isSystemPageId(pageId: string) {
  return isCollectionPageId(pageId) || isRecycleBinPageId(pageId);
}

export type BoxItem = WorkspaceItem;
export type FolderItem = Extract<WorkspaceItem, { type: 'folder' }>;
export type FileItem = Extract<WorkspaceItem, { type: 'file' }>;
export type ShortcutItem = Extract<WorkspaceItem, { type: 'shortcut' }>;
export type BookmarkItem = Extract<WorkspaceItem, { type: 'bookmark' }>;
export type ClipboardItem = Extract<WorkspaceItem, { type: 'clipboard' }>;
