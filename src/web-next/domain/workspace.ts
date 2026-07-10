export type WorkspaceItemType = 'folder' | 'bookmark' | 'clipboard';
export type WorkspaceBoxPreset = 'general' | 'folder' | 'bookmark' | 'clipboard';
export type WorkspaceBoxViewMode = 'list' | 'grid';
export type WorkspaceBoxDetailMode = 'detailed' | 'compact';

export const RECYCLE_BIN_PAGE_ID = 'khaosbox-recycle-bin';

export function isRecycleBinPageId(pageId: string) {
  return pageId === RECYCLE_BIN_PAGE_ID;
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
  kind: 'file' | 'folder' | 'path';
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

export type BoxItem = FolderItem | BookmarkItem | ClipboardItem;

export interface WorkspaceBox {
  id: string;
  pageId: string;
  preset: WorkspaceBoxPreset;
  title: string;
  frame: BoxFrame;
  items: BoxItem[];
  viewMode?: WorkspaceBoxViewMode;
  detailMode?: WorkspaceBoxDetailMode;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSnapshot {
  pages: WorkspacePage[];
  activePageId: string;
  defaultPageId: string;
  boxes: WorkspaceBox[];
}
