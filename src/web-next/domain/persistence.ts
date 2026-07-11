import {
  isCollectionPageId,
  isRecycleBinPageId,
  isSystemPageId,
  type BoxItem,
  type WorkspaceBox,
  type CollectionBoxView,
  type WorkspacePage,
  type WorkspaceSnapshot,
} from './workspace';
import { isWorkspaceBoxIcon, normalizeBoxAccent } from './boxAppearance';

export function restoreWorkspaceSnapshot(input: unknown, fallback: WorkspaceSnapshot) {
  return parseWorkspaceSnapshot(input) ?? fallback;
}

export function parseWorkspaceSnapshot(input: unknown): WorkspaceSnapshot | null {
  if (
    !isRecord(input) ||
    !Array.isArray(input.pages) ||
    !Array.isArray(input.boxes) ||
    !Array.isArray(input.collectionBoxIds) ||
    !isRecord(input.collectionViews) ||
    typeof input.activePageId !== 'string' ||
    typeof input.defaultPageId !== 'string'
  ) {
    return null;
  }

  if (!input.pages.every(isWorkspacePage)) return null;
  const parsedPages = [...input.pages].sort((first, second) => first.order - second.order);
  if (new Set(parsedPages.map((page) => page.id)).size !== parsedPages.length) return null;
  const workspacePages = parsedPages.filter((page) => !isSystemPageId(page.id));
  const collectionPages = parsedPages.filter((page) => isCollectionPageId(page.id));
  const recycleBinPages = parsedPages.filter((page) => isRecycleBinPageId(page.id));
  if (workspacePages.length === 0 || collectionPages.length !== 1 || recycleBinPages.length !== 1)
    return null;
  const defaultPageId = input.defaultPageId;
  if (!workspacePages.some((page) => page.id === defaultPageId)) {
    return null;
  }
  const pages = [
    { ...collectionPages[0]!, order: -1 },
    ...workspacePages.map((page, order) => ({ ...page, order })),
    { ...recycleBinPages[0]!, order: workspacePages.length },
  ];

  const pageIds = new Set(pages.map((page) => page.id));
  if (!pageIds.has(input.activePageId)) return null;
  const parsedBoxes = input.boxes.map(parseWorkspaceBox);
  if (parsedBoxes.some((box) => box === null)) return null;
  const boxes = parsedBoxes as WorkspaceBox[];
  if (
    new Set(boxes.map((box) => box.id)).size !== boxes.length ||
    boxes.some((box) => !pageIds.has(box.pageId) || isCollectionPageId(box.pageId))
  ) {
    return null;
  }
  const collectableBoxIds = new Set(
    boxes.filter((box) => !isRecycleBinPageId(box.pageId)).map((box) => box.id),
  );
  if (
    !input.collectionBoxIds.every((id): id is string => typeof id === 'string') ||
    new Set(input.collectionBoxIds).size !== input.collectionBoxIds.length ||
    input.collectionBoxIds.some((id) => !collectableBoxIds.has(id))
  ) {
    return null;
  }
  const collectionBoxIds = [...input.collectionBoxIds];
  const storedViewIds = Object.keys(input.collectionViews);
  if (
    storedViewIds.length !== collectionBoxIds.length ||
    storedViewIds.some((boxId) => !collectionBoxIds.includes(boxId))
  ) {
    return null;
  }
  const collectionViews: Record<string, CollectionBoxView> = {};
  for (const boxId of collectionBoxIds) {
    const view = parseCollectionBoxView(input.collectionViews[boxId], boxId);
    if (!view) return null;
    collectionViews[boxId] = view;
  }

  return {
    pages,
    activePageId: defaultPageId,
    defaultPageId,
    boxes,
    collectionBoxIds,
    collectionViews,
  };
}

function parseCollectionBoxView(input: unknown, boxId: string): CollectionBoxView | null {
  if (!isRecord(input) || input.boxId !== boxId || !isRecord(input.frame)) return null;
  const frame = input.frame;
  if (
    typeof frame.x !== 'number' ||
    typeof frame.y !== 'number' ||
    typeof frame.width !== 'number' ||
    typeof frame.height !== 'number' ||
    frame.width <= 0 ||
    frame.height <= 0 ||
    (input.viewMode !== 'list' && input.viewMode !== 'grid') ||
    (input.detailMode !== 'detailed' && input.detailMode !== 'compact') ||
    typeof input.order !== 'number'
  ) {
    return null;
  }
  return {
    boxId,
    frame: {
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
    },
    viewMode: input.viewMode,
    detailMode: input.detailMode,
    order: input.order,
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
    !isWorkspaceBoxPreset(input.preset) ||
    (input.kind !== 'normal' && input.kind !== 'temporary') ||
    (input.viewMode !== 'list' && input.viewMode !== 'grid') ||
    (input.detailMode !== 'detailed' && input.detailMode !== 'compact') ||
    typeof input.isLocked !== 'boolean' ||
    (input.icon !== undefined && !isWorkspaceBoxIcon(input.icon)) ||
    (input.accent !== undefined && typeof input.accent !== 'string') ||
    typeof input.createdAt !== 'string' ||
    typeof input.updatedAt !== 'string'
  ) {
    return null;
  }

  const accent = input.accent === undefined ? undefined : normalizeBoxAccent(input.accent);
  if (input.accent !== undefined && !accent) return null;
  const parsedItems = input.items.map(parseBoxItem);
  if (parsedItems.some((item) => item === null)) return null;
  const items = parsedItems as BoxItem[];
  if (new Set(items.map((item) => item.id)).size !== items.length) return null;

  return {
    id: input.id,
    pageId: input.pageId,
    preset: input.preset,
    kind: input.kind,
    title: input.title,
    frame: input.frame as WorkspaceBox['frame'],
    items,
    viewMode: input.viewMode,
    detailMode: input.detailMode,
    isLocked: input.isLocked,
    ...(input.icon ? { icon: input.icon } : {}),
    ...(accent ? { accent } : {}),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function isWorkspaceBoxPreset(input: unknown): input is WorkspaceBox['preset'] {
  return input === 'general' || input === 'folder' || input === 'bookmark' || input === 'clipboard';
}

function parseBoxItem(input: unknown): BoxItem | null {
  if (
    !isRecord(input) ||
    typeof input.id !== 'string' ||
    typeof input.title !== 'string' ||
    typeof input.isPinned !== 'boolean' ||
    typeof input.createdAt !== 'string' ||
    typeof input.updatedAt !== 'string'
  ) {
    return null;
  }

  const base = {
    id: input.id,
    title: input.title,
    isPinned: input.isPinned,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };

  if (
    input.type === 'bookmark' &&
    typeof input.url === 'string' &&
    (input.favicon === undefined || typeof input.favicon === 'string')
  ) {
    return {
      ...base,
      type: 'bookmark',
      url: input.url,
      ...(typeof input.favicon === 'string' ? { favicon: input.favicon } : {}),
    };
  }

  if (input.type === 'clipboard' && input.title === '' && typeof input.text === 'string') {
    return { ...base, type: 'clipboard', title: '', text: input.text };
  }

  if ((input.type === 'file' || input.type === 'folder') && typeof input.path === 'string') {
    return { ...base, type: input.type, path: input.path };
  }

  if (
    input.type === 'shortcut' &&
    typeof input.path === 'string' &&
    (input.targetType === undefined ||
      input.targetType === 'file' ||
      input.targetType === 'folder' ||
      input.targetType === 'application')
  ) {
    return {
      ...base,
      type: 'shortcut',
      path: input.path,
      ...(input.targetType ? { targetType: input.targetType } : {}),
    };
  }

  return null;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}
