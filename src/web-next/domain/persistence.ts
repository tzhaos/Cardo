import { createRecycleBinPage } from './factories';
import {
  isRecycleBinPageId,
  type WorkspaceBox,
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
    boxes: input.boxes.filter(
      (box): box is WorkspaceBox => isWorkspaceBox(box) && pageIds.has(box.pageId),
    ),
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

function isWorkspaceBox(input: unknown): input is WorkspaceBox {
  return (
    isRecord(input) &&
    typeof input.id === 'string' &&
    typeof input.pageId === 'string' &&
    (input.type === 'folder' || input.type === 'bookmark' || input.type === 'clipboard') &&
    typeof input.title === 'string' &&
    isRecord(input.frame) &&
    typeof input.frame.x === 'number' &&
    typeof input.frame.y === 'number' &&
    typeof input.frame.width === 'number' &&
    typeof input.frame.height === 'number' &&
    Array.isArray(input.items) &&
    typeof input.createdAt === 'string' &&
    typeof input.updatedAt === 'string'
  );
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}
