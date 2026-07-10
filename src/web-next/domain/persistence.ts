import { createRecycleBinPage } from './factories';
import {
  isRecycleBinPageId,
  type BoxItem,
  type WorkspaceBox,
  type WorkspaceBoxPreset,
  type WorkspacePage,
  type WorkspaceSnapshot,
} from './workspace';

export function restoreWorkspaceSnapshot(input: unknown, fallback: WorkspaceSnapshot) {
  return parseWorkspaceSnapshot(input) ?? fallback;
}

export function parseWorkspaceSnapshot(input: unknown): WorkspaceSnapshot | null {
  if (!isRecord(input) || !Array.isArray(input.pages) || !Array.isArray(input.boxes)) {
    return null;
  }

  const parsedPages = input.pages
    .filter(isWorkspacePage)
    .sort((first, second) => first.order - second.order)
    .map((page, order) => ({ ...page, order }));
  const workspacePages = parsedPages.filter((page) => !isRecycleBinPageId(page.id));
  if (workspacePages.length === 0) {
    return null;
  }
  const existingRecycleBin = parsedPages.find((page) => isRecycleBinPageId(page.id));
  const pages = [
    ...workspacePages.map((page, order) => ({ ...page, order })),
    existingRecycleBin
      ? { ...existingRecycleBin, title: 'Recycle Bin', order: workspacePages.length }
      : createRecycleBinPage(workspacePages.length),
  ];

  const pageIds = new Set(pages.map((page) => page.id));
  const legacyActivePageId =
    typeof input.activePageId === 'string' && pageIds.has(input.activePageId)
      ? input.activePageId
      : null;
  const defaultPageId =
    typeof input.defaultPageId === 'string' &&
    pageIds.has(input.defaultPageId) &&
    !isRecycleBinPageId(input.defaultPageId)
      ? input.defaultPageId
      : legacyActivePageId && !isRecycleBinPageId(legacyActivePageId)
        ? legacyActivePageId
        : workspacePages[0].id;

  return {
    pages,
    activePageId: defaultPageId,
    defaultPageId,
    boxes: input.boxes
      .map(parseWorkspaceBox)
      .filter((box): box is WorkspaceBox => box !== null)
      .filter((box) => pageIds.has(box.pageId)),
  };
}

export function extractPersistedWorkspaceSnapshot(input: unknown): WorkspaceSnapshot | null {
  if (!isRecord(input)) {
    return null;
  }

  const state = isRecord(input.state) ? input.state : input;
  return parseWorkspaceSnapshot(state.snapshot ?? state);
}

function isWorkspacePage(input: unknown): input is WorkspacePage {
  return (
    isRecord(input) &&
    typeof input.id === 'string' &&
    typeof input.title === 'string' &&
    typeof input.order === 'number' &&
    typeof input.createdAt === 'string' &&
    typeof input.updatedAt === 'string'
  );
}

function parseWorkspaceBox(input: unknown): WorkspaceBox | null {
  if (
    !isRecord(input) ||
    typeof input.id !== 'string' ||
    typeof input.pageId !== 'string' ||
    typeof input.title !== 'string' ||
    !isRecord(input.frame) ||
    typeof input.frame.x !== 'number' ||
    typeof input.frame.y !== 'number' ||
    typeof input.frame.width !== 'number' ||
    typeof input.frame.height !== 'number' ||
    !Array.isArray(input.items) ||
    (input.viewMode !== undefined && input.viewMode !== 'list' && input.viewMode !== 'grid') ||
    (input.detailMode !== undefined &&
      input.detailMode !== 'detailed' &&
      input.detailMode !== 'compact') ||
    (input.isPinned !== undefined && typeof input.isPinned !== 'boolean') ||
    typeof input.createdAt !== 'string' ||
    typeof input.updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: input.id,
    pageId: input.pageId,
    preset: resolveBoxPreset(input.preset ?? input.type),
    kind: input.kind === 'temporary' ? 'temporary' : 'normal',
    title: input.title,
    frame: input.frame as WorkspaceBox['frame'],
    items: input.items.map(parseBoxItem).filter((item): item is BoxItem => item !== null),
    ...(input.viewMode ? { viewMode: input.viewMode } : {}),
    ...(input.detailMode ? { detailMode: input.detailMode } : {}),
    ...(typeof input.isPinned === 'boolean' ? { isPinned: input.isPinned } : {}),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function resolveBoxPreset(input: unknown): WorkspaceBoxPreset {
  return input === 'folder' || input === 'bookmark' || input === 'clipboard' ? input : 'general';
}

function parseBoxItem(input: unknown): BoxItem | null {
  if (
    !isRecord(input) ||
    typeof input.id !== 'string' ||
    typeof input.title !== 'string' ||
    typeof input.createdAt !== 'string' ||
    typeof input.updatedAt !== 'string' ||
    (input.isPinned !== undefined && typeof input.isPinned !== 'boolean')
  ) {
    return null;
  }

  const base = {
    id: input.id,
    title: input.title,
    ...(typeof input.isPinned === 'boolean' ? { isPinned: input.isPinned } : {}),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };

  if (input.type === 'bookmark' && typeof input.url === 'string') {
    return {
      ...base,
      type: 'bookmark',
      url: input.url,
      ...(typeof input.favicon === 'string' ? { favicon: input.favicon } : {}),
    };
  }

  if (input.type === 'clipboard' && typeof input.text === 'string') {
    return { ...base, type: 'clipboard', title: '', text: input.text };
  }

  if (
    (input.type === 'file' || input.type === 'shortcut' || input.type === 'folder') &&
    typeof input.path === 'string'
  ) {
    const normalizedType =
      input.type === 'folder' && input.kind === 'file'
        ? 'file'
        : input.type === 'folder' && input.kind === 'path'
          ? 'shortcut'
          : input.type;
    return { ...base, type: normalizedType, path: input.path };
  }

  return null;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}
