import type {
  BoxFrame,
  BoxItem,
  WorkspaceBox,
  WorkspaceBoxType,
  WorkspacePage,
  WorkspaceSnapshot,
} from './workspace';

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
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createDefaultWorkspace(): WorkspaceSnapshot {
  const pages = ['Workspaces', 'Personal', 'Inspiration'].map((title, index) =>
    createPage(title, index),
  );

  const firstPageId = pages[0]?.id ?? createId('page');

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
  const base = {
    id: createId('item'),
    title: draft.title?.trim() || getDefaultBoxTitle(type).replace(' Box', ''),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  switch (type) {
    case 'folder':
      return {
        ...base,
        type,
        path: draft.path?.trim() || 'Untitled path',
        kind: draft.kind === 'file' || draft.kind === 'folder' ? draft.kind : 'path',
      };
    case 'bookmark':
      return {
        ...base,
        type,
        url: draft.url?.trim() || 'https://example.com',
      };
    case 'clipboard':
      return {
        ...base,
        type,
        text: draft.text?.trim() || 'Clipboard note',
      };
  }
}
