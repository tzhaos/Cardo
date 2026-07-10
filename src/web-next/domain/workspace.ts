export type WorkspaceBoxType = 'folder' | 'bookmark' | 'clipboard';
export type WorkspaceBoxViewMode = 'list' | 'grid';

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

export interface WorkspaceViewport {
  width: number;
  height: number;
}

export interface BaseBoxItem {
  id: string;
  type: WorkspaceBoxType;
  title: string;
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
  type: WorkspaceBoxType;
  title: string;
  frame: BoxFrame;
  items: BoxItem[];
  viewMode?: WorkspaceBoxViewMode;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSnapshot {
  pages: WorkspacePage[];
  activePageId: string;
  defaultPageId: string;
  boxes: WorkspaceBox[];
  layoutViewport?: WorkspaceViewport;
}
