import type {
  BoxFrame,
  CollectionBoxView,
  WorkspaceBox,
  WorkspaceBoxDetailMode,
  WorkspaceBoxIcon,
  WorkspaceBoxKind,
  WorkspaceBoxViewMode,
  WorkspaceItem,
  WorkspaceItemType,
  WorkspacePage,
  WorkspaceProjection,
} from '../../core/contracts/workspace';
export {
  COLLECTION_PAGE_ID,
  RECYCLE_BIN_PAGE_ID,
  isCollectionPageId,
  isRecycleBinPageId,
  isSystemPageId,
} from '../../core/contracts/systemPages';

export type {
  BoxFrame,
  CollectionBoxView,
  WorkspaceBox,
  WorkspaceBoxDetailMode,
  WorkspaceBoxIcon,
  WorkspaceBoxKind,
  WorkspaceBoxViewMode,
  WorkspaceItemType,
  WorkspacePage,
  WorkspaceProjection,
};

export type BoxItem = WorkspaceItem;
export type FolderItem = Extract<WorkspaceItem, { type: 'folder' }>;
export type FileItem = Extract<WorkspaceItem, { type: 'file' }>;
export type ShortcutItem = Extract<WorkspaceItem, { type: 'shortcut' }>;
export type BookmarkItem = Extract<WorkspaceItem, { type: 'bookmark' }>;
export type ClipboardItem = Extract<WorkspaceItem, { type: 'clipboard' }>;
