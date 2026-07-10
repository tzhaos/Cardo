import { createCollectionPage, createRecycleBinPage } from './factories';
import {
  isCollectionPageId,
  isRecycleBinPageId,
  isSystemPageId,
  type BoxItem,
  type WorkspaceBox,
  type CollectionBoxView,
  type WorkspaceBoxPreset,
  type WorkspacePage,
  type WorkspaceSnapshot,
} from './workspace';
import { isWorkspaceBoxIcon, normalizeBoxAccent } from './boxAppearance';

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
  const workspacePages = parsedPages.filter((page) => !isSystemPageId(page.id));
  if (workspacePages.length === 0) {
    return null;
  }
  const existingRecycleBin = parsedPages.find((page) => isRecycleBinPageId(page.id));
  const existingCollection = parsedPages.find((page) => isCollectionPageId(page.id));
  const pages = [
    existingCollection
      ? { ...existingCollection, title: 'Collection', order: -1 }
      : createCollectionPage(),
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
    !isSystemPageId(input.defaultPageId)
      ? input.defaultPageId
      : legacyActivePageId && !isSystemPageId(legacyActivePageId)
        ? legacyActivePageId
        : workspacePages[0].id;

  const boxes = input.boxes
    .map(parseWorkspaceBox)
    .filter((box): box is WorkspaceBox => box !== null)
    .filter((box) => pageIds.has(box.pageId) && !isCollectionPageId(box.pageId));
  const collectableBoxIds = new Set(
    boxes.filter((box) => !isRecycleBinPageId(box.pageId)).map((box) => box.id),
  );
  const collectionBoxIds = Array.isArray(input.collectionBoxIds)
    ? [
        ...new Set(input.collectionBoxIds.filter((id): id is string => typeof id === 'string')),
      ].filter((id) => collectableBoxIds.has(id))
    : [];
  const storedCollectionViews = isRecord(input.collectionViews) ? input.collectionViews : {};
  const collectionViews = Object.fromEntries(
    collectionBoxIds.map((boxId, index) => {
      const box = boxes.find((candidate) => candidate.id === boxId)!;
      return [boxId, parseCollectionBoxView(storedCollectionViews[boxId], box, index)];
    }),
  );

  return {
    pages,
    activePageId: legacyActivePageId ?? defaultPageId,
    defaultPageId,
    boxes,
    collectionBoxIds,
    collectionViews,
  };
}

function parseCollectionBoxView(
  input: unknown,
  box: WorkspaceBox,
  index: number,
): CollectionBoxView {
  const fallback: CollectionBoxView = {
    boxId: box.id,
    frame: {
      x: 64 + (index % 3) * 350,
      y: 92 + Math.floor(index / 3) * 290,
      width: Math.max(280, Math.min(520, box.frame.width)),
      height: Math.max(220, Math.min(460, box.frame.height)),
    },
    viewMode: box.viewMode ?? 'list',
    detailMode: box.detailMode ?? 'detailed',
    order: index,
  };
  if (!isRecord(input) || !isRecord(input.frame)) return fallback;
  const frame = input.frame;
  if (
    typeof frame.x !== 'number' ||
    typeof frame.y !== 'number' ||
    typeof frame.width !== 'number' ||
    typeof frame.height !== 'number'
  ) {
    return fallback;
  }
  return {
    boxId: box.id,
    frame: {
      x: frame.x,
      y: frame.y,
      width: Math.max(240, frame.width),
      height: Math.max(170, frame.height),
    },
    viewMode: input.viewMode === 'grid' ? 'grid' : 'list',
    detailMode: input.detailMode === 'compact' ? 'compact' : 'detailed',
    order: typeof input.order === 'number' ? input.order : index,
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
    (input.isLocked !== undefined && typeof input.isLocked !== 'boolean') ||
    (input.isPinned !== undefined && typeof input.isPinned !== 'boolean') ||
    typeof input.createdAt !== 'string' ||
    typeof input.updatedAt !== 'string'
  ) {
    return null;
  }

  const accent = typeof input.accent === 'string' ? normalizeBoxAccent(input.accent) : null;

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
    isLocked:
      typeof input.isLocked === 'boolean'
        ? input.isLocked
        : typeof input.isPinned === 'boolean'
          ? input.isPinned
          : false,
    ...(isWorkspaceBoxIcon(input.icon) ? { icon: input.icon } : {}),
    ...(accent ? { accent } : {}),
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
