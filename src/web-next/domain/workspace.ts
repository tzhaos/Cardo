export type WorkspaceItemType = 'file' | 'shortcut' | 'folder' | 'bookmark' | 'clipboard';
export type WorkspaceBoxPreset = 'general' | 'folder' | 'bookmark' | 'clipboard';
export type WorkspaceBoxViewMode = 'list' | 'grid';
export type WorkspaceBoxDetailMode = 'detailed' | 'compact';
export type WorkspaceBoxKind = 'normal' | 'temporary';
export type WorkspaceBoxIcon =
  | 'box'
  | 'folder'
  | 'bookmark'
  | 'clipboard'
  | 'briefcase'
  | 'code'
  | 'image'
  | 'music'
  | 'book'
  | 'idea'
  | 'star'
  | 'heart';

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

export interface WorkspacePage {
  id: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoxFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseBoxItem {
  id: string;
  type: WorkspaceItemType;
  title: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FolderItem extends BaseBoxItem {
  type: 'folder';
  path: string;
}

export interface FileItem extends BaseBoxItem {
  type: 'file';
  path: string;
}

export interface ShortcutItem extends BaseBoxItem {
  type: 'shortcut';
  path: string;
  targetType?: 'file' | 'folder' | 'application';
}

export interface BookmarkItem extends BaseBoxItem {
  type: 'bookmark';
  url: string;
  favicon?: string;
}

export interface ClipboardItem extends BaseBoxItem {
  type: 'clipboard';
  text: string;
}

export type BoxItem = FileItem | ShortcutItem | FolderItem | BookmarkItem | ClipboardItem;

export interface WorkspaceBox {
  id: string;
  pageId: string;
  preset: WorkspaceBoxPreset;
  kind?: WorkspaceBoxKind;
  title: string;
  frame: BoxFrame;
  items: BoxItem[];
  viewMode?: WorkspaceBoxViewMode;
  detailMode?: WorkspaceBoxDetailMode;
  isLocked?: boolean;
  icon?: WorkspaceBoxIcon;
  accent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionBoxView {
  boxId: string;
  frame: BoxFrame;
  viewMode: WorkspaceBoxViewMode;
  detailMode: WorkspaceBoxDetailMode;
  order: number;
}

export interface WorkspaceSnapshot {
  pages: WorkspacePage[];
  activePageId: string;
  defaultPageId?: string;
  boxes: WorkspaceBox[];
  collectionBoxIds?: string[];
  collectionViews?: Record<string, CollectionBoxView>;
}
