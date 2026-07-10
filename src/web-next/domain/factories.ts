import { RECYCLE_BIN_PAGE_ID } from './workspace';
import type {
  BoxFrame,
  BoxItem,
  WorkspaceBox,
  WorkspaceBoxType,
  WorkspacePage,
  WorkspaceSnapshot,
} from './workspace';
import {
  deriveBookmarkItemTitle,
  deriveFolderItemTitle,
  parseFolderPathInput,
} from './itemMetadata';

let sequence = 0;

export function createId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createPage(title: string, order: number): WorkspacePage {
  const timestamp = nowIso();
  return {
    id: createId('page'),
    title,
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createRecycleBinPage(order: number): WorkspacePage {
  const timestamp = nowIso();
  return {
    id: RECYCLE_BIN_PAGE_ID,
    title: 'Recycle Bin',
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getDefaultFrame(type: WorkspaceBoxType, x: number, y: number): BoxFrame {
  return {
    x,
    y,
    width: 320,
    height: 240,
  };
}

export function createWorkspaceBox(
  pageId: string,
  type: WorkspaceBoxType,
  frame: BoxFrame,
  title = getDefaultBoxTitle(type),
): WorkspaceBox {
  const timestamp = nowIso();
  return {
    id: createId('box'),
    pageId,
    type,
    title,
    frame,
    items: [],
    viewMode: 'list',
    detailMode: 'detailed',
    isPinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createDefaultWorkspace(): WorkspaceSnapshot {
  const workspacePages = ['Workspaces', 'Personal', 'Inspiration'].map((title, index) =>
    createPage(title, index),
  );
  const pages = [...workspacePages, createRecycleBinPage(workspacePages.length)];

  const firstPageId = workspacePages[0]?.id ?? createId('page');

  return {
    pages,
    activePageId: firstPageId,
    defaultPageId: firstPageId,
    boxes: [
      createWorkspaceBox(firstPageId, 'folder', getDefaultFrame('folder', 120, 130)),
      createWorkspaceBox(firstPageId, 'bookmark', getDefaultFrame('bookmark', 500, 165)),
      createWorkspaceBox(firstPageId, 'clipboard', getDefaultFrame('clipboard', 170, 380)),
    ],
  };
}

export function getDefaultBoxTitle(type: WorkspaceBoxType) {
  switch (type) {
    case 'folder':
      return 'Folder Box';
    case 'bookmark':
      return 'Bookmark Box';
    case 'clipboard':
      return 'Clipboard Box';
  }
}

export function createItem(type: WorkspaceBoxType, draft: Record<string, string>): BoxItem {
  const timestamp = nowIso();
  const base = { id: createId('item'), createdAt: timestamp, updatedAt: timestamp };
  const explicitTitle = draft.title?.trim() ?? '';

  switch (type) {
    case 'folder': {
      const path = parseFolderPathInput(draft.path ?? '') ?? draft.path?.trim() ?? '';
      return {
        ...base,
        type,
        title: explicitTitle || deriveFolderItemTitle(path),
        path,
        kind: 'folder',
      };
    }
    case 'bookmark': {
      const url = draft.url?.trim() ?? '';
      return {
        ...base,
        type,
        title: explicitTitle || deriveBookmarkItemTitle(url),
        url,
      };
    }
    case 'clipboard':
      return {
        ...base,
        type,
        title: explicitTitle,
        text: draft.text?.trim() ?? '',
      };
  }
}
