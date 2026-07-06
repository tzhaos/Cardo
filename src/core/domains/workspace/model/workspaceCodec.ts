import { createWorkspaceItem, type WorkspaceItem } from '../../items/model/item';
import type { Bookmark, BookmarkFolder, BookmarkSource } from '../../bookmarks/model/bookmark';
import { normalizeBookmarkUrl } from '../../bookmarks/services/normalizeBookmarkUrl';
import {
  BOX_MIN_HEIGHT,
  BOX_MIN_WIDTH,
  BOX_TEMPLATE_IDS,
  DEFAULT_BOX_TEMPLATE_ID,
  WORKSPACE_EXPORT_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  isKanbanTemplateId,
  type BoxDesktopViewState,
  type BoxItemPlacement,
  type BoxTemplateId,
  type KanbanColumn,
  type WorkspaceBoxEntity,
  type WorkspaceBoxTemplateState,
  type WorkspaceExportBoxV4,
  type WorkspaceExportDocumentV5,
  type WorkspaceSnapshot,
  type WorkspaceSnapshotV7,
} from './workspace';
import { createDefaultTemplateState } from './boxTemplates';

const BOX_TEMPLATE_ID_SET = new Set<string>(BOX_TEMPLATE_IDS);
const LEGACY_WORKSPACE_SCHEMA_VERSIONS = new Set([5, 6]);
const LEGACY_WORKSPACE_EXPORT_VERSIONS = new Set([3, 4]);
const BOOKMARK_SOURCES = new Set<BookmarkSource>(['manual', 'import', 'item']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asString(item)?.trim()).filter((item): item is string => !!item)
    : [];
}

function asBookmarkSource(value: unknown): BookmarkSource {
  const source = asString(value)?.trim();
  return source && BOOKMARK_SOURCES.has(source as BookmarkSource)
    ? (source as BookmarkSource)
    : 'manual';
}

function asTemplateId(value: unknown): BoxTemplateId {
  const templateId = asString(value)?.trim();
  return templateId && BOX_TEMPLATE_ID_SET.has(templateId)
    ? (templateId as BoxTemplateId)
    : DEFAULT_BOX_TEMPLATE_ID;
}

function normalizeKanbanColumns(templateId: BoxTemplateId, input: unknown): KanbanColumn[] {
  const defaultColumns = createDefaultTemplateState(templateId).kanbanColumns ?? [];

  if (!Array.isArray(input)) {
    return defaultColumns;
  }

  const columns = input.flatMap((column) => {
    if (!isRecord(column)) {
      return [];
    }

    const id = asString(column.id)?.trim();
    const title = asString(column.title)?.trim();
    return id && title ? [{ id, title }] : [];
  });

  return columns.length > 0 ? columns : defaultColumns;
}

function normalizeTemplateState(
  templateId: BoxTemplateId,
  input: unknown,
): WorkspaceBoxTemplateState {
  if (!isKanbanTemplateId(templateId)) {
    return {};
  }

  const rawState = isRecord(input) ? input : {};
  return {
    kanbanColumns: normalizeKanbanColumns(templateId, rawState.kanbanColumns),
  };
}

function normalizeWorkspaceItem(input: unknown): WorkspaceItem | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = asString(input.id)?.trim();
  const type = asString(input.type)?.trim();

  if (!id || !type || !['file', 'folder', 'url', 'note', 'shortcut'].includes(type)) {
    return null;
  }

  const content =
    type === 'url'
      ? asString(input.url)?.trim() || asString(input.content)?.trim()
      : type === 'note'
        ? asString(input.text)?.trim() || asString(input.content)?.trim()
        : asString(input.path)?.trim() || asString(input.content)?.trim();

  if (!content) {
    return null;
  }

  const bookmarkId = type === 'url' ? asString(input.bookmarkId)?.trim() : null;

  return createWorkspaceItem(id, {
    type: type as WorkspaceItem['type'],
    content,
    title: asString(input.title)?.trim() || null,
    ...(bookmarkId ? { bookmarkId } : {}),
  });
}

function normalizeBookmark(input: unknown): Bookmark | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = asString(input.id)?.trim();
  const url = asString(input.url)?.trim();

  if (!id || !url) {
    return null;
  }

  const title = asString(input.title)?.trim() || url;
  const normalizedUrl = asString(input.normalizedUrl)?.trim() || normalizeBookmarkUrl(url);
  const folderId = asString(input.folderId)?.trim() || null;
  const createdAt = asString(input.createdAt)?.trim() || new Date(0).toISOString();
  const updatedAt = asString(input.updatedAt)?.trim() || createdAt;
  const lastOpenedAt = asString(input.lastOpenedAt)?.trim() || null;

  return {
    id,
    title,
    url,
    normalizedUrl,
    description: asString(input.description)?.trim() || null,
    tags: asStringArray(input.tags),
    folderId,
    source: asBookmarkSource(input.source),
    createdAt,
    updatedAt,
    lastOpenedAt,
    openCount: Math.max(0, Math.round(asNumber(input.openCount, 0))),
    isFavorite: asBoolean(input.isFavorite),
    isPinned: asBoolean(input.isPinned),
  };
}

function normalizeBookmarkFolder(input: unknown): BookmarkFolder | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = asString(input.id)?.trim();
  const title = asString(input.title)?.trim();

  if (!id || !title) {
    return null;
  }

  const createdAt = asString(input.createdAt)?.trim() || new Date(0).toISOString();

  return {
    id,
    title,
    parentId: asString(input.parentId)?.trim() || null,
    source: asBookmarkSource(input.source),
    createdAt,
    updatedAt: asString(input.updatedAt)?.trim() || createdAt,
  };
}

function normalizeBoxEntity(input: unknown): WorkspaceBoxEntity | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = asString(input.id)?.trim();

  if (!id || 'role' in input) {
    return null;
  }

  const templateId = asTemplateId(input.templateId);

  return {
    id,
    customTitle: asString(input.customTitle)?.trim() || null,
    templateId,
    templateState: normalizeTemplateState(templateId, input.templateState),
  };
}

function normalizeViewState(input: unknown, index: number): BoxDesktopViewState | null {
  if (!isRecord(input)) {
    return null;
  }

  const boxId = asString(input.boxId)?.trim();
  const rawBounds = isRecord(input.bounds) ? input.bounds : {};

  if (!boxId) {
    return null;
  }

  const layout = asString(input.layout) === 'grid' ? 'grid' : 'list';

  return {
    boxId,
    bounds: {
      x: asNumber(rawBounds.x, 100 + index * 40),
      y: asNumber(rawBounds.y, 100 + index * 40),
      width: Math.max(BOX_MIN_WIDTH, asNumber(rawBounds.width, 320)),
      height: Math.max(BOX_MIN_HEIGHT, asNumber(rawBounds.height, 400)),
    },
    isLocked: asBoolean(input.isLocked),
    isCollapsed: asBoolean(input.isCollapsed),
    isMinimized: asBoolean(input.isMinimized),
    layout,
    zIndex: Math.max(0, Math.round(asNumber(input.zIndex, index + 1))),
  };
}

function normalizePlacement(input: unknown): BoxItemPlacement | null {
  if (!isRecord(input)) {
    return null;
  }

  const itemId = asString(input.itemId)?.trim();
  const columnId = asString(input.columnId)?.trim();

  return itemId
    ? {
        itemId,
        isPinned: asBoolean(input.isPinned),
        ...(columnId ? { columnId } : {}),
      }
    : null;
}

function normalizePlacementList(input: unknown): BoxItemPlacement[] | null {
  const rawPlacements = Array.isArray(input) ? input : [];
  const placements = rawPlacements
    .map(normalizePlacement)
    .filter((placement): placement is BoxItemPlacement => placement !== null);

  return placements.length === rawPlacements.length ? placements : null;
}

function normalizeLegacyItemIdPlacements(input: unknown): BoxItemPlacement[] | null {
  if (!Array.isArray(input)) {
    return [];
  }

  const placements = input.flatMap((itemId) => {
    const normalizedItemId = asString(itemId)?.trim();
    return normalizedItemId ? [{ itemId: normalizedItemId, isPinned: false }] : [];
  });

  return placements.length === input.length ? placements : null;
}

function createExportDocumentFromSnapshot(
  snapshot: Pick<
    WorkspaceSnapshotV7,
    | 'boxesById'
    | 'boxOrder'
    | 'boxViewStatesById'
    | 'itemsById'
    | 'itemPlacementsByBoxId'
    | 'bookmarksById'
    | 'bookmarkFoldersById'
    | 'bookmarkFolderOrder'
  >,
): WorkspaceExportDocumentV5 {
  const boxes: WorkspaceExportBoxV4[] = snapshot.boxOrder
    .map((boxId) => snapshot.boxesById[boxId])
    .filter((box): box is WorkspaceBoxEntity => Boolean(box))
    .map((box) => ({
      ...box,
      itemIds: (snapshot.itemPlacementsByBoxId[box.id] ?? []).map((placement) => placement.itemId),
    }));

  return {
    version: WORKSPACE_EXPORT_VERSION,
    boxes,
    items: Object.values(snapshot.itemsById),
    itemPlacementsByBoxId: Object.fromEntries(
      boxes.map((box) => [box.id, snapshot.itemPlacementsByBoxId[box.id] ?? []]),
    ),
    boxViewStates: snapshot.boxOrder
      .map((boxId) => snapshot.boxViewStatesById[boxId])
      .filter((viewState): viewState is BoxDesktopViewState => Boolean(viewState)),
    bookmarks: Object.values(snapshot.bookmarksById),
    bookmarkFolders: snapshot.bookmarkFolderOrder
      .map((folderId) => snapshot.bookmarkFoldersById[folderId])
      .filter((folder): folder is BookmarkFolder => Boolean(folder)),
  };
}

export function createWorkspaceExportDocument(
  snapshot: Pick<
    WorkspaceSnapshotV7,
    | 'boxesById'
    | 'boxOrder'
    | 'boxViewStatesById'
    | 'itemsById'
    | 'itemPlacementsByBoxId'
    | 'bookmarksById'
    | 'bookmarkFoldersById'
    | 'bookmarkFolderOrder'
  >,
): WorkspaceExportDocumentV5 {
  return createExportDocumentFromSnapshot(snapshot);
}

function normalizeExportDocument(input: Record<string, unknown>): WorkspaceExportDocumentV5 | null {
  if (!Array.isArray(input.boxes) || !Array.isArray(input.items)) {
    return null;
  }

  const boxes: WorkspaceExportBoxV4[] = [];
  const boxViewStates: BoxDesktopViewState[] = [];
  const itemPlacementsByBoxId: Record<string, BoxItemPlacement[]> = {};
  const rawPlacementsByBoxId = isRecord(input.itemPlacementsByBoxId)
    ? input.itemPlacementsByBoxId
    : {};
  const rawViewStatesByBoxId = new Map<string, unknown>();

  if (Array.isArray(input.boxViewStates)) {
    for (const rawViewState of input.boxViewStates) {
      if (isRecord(rawViewState) && typeof rawViewState.boxId === 'string') {
        rawViewStatesByBoxId.set(rawViewState.boxId, rawViewState);
      }
    }
  }

  for (const [index, rawBox] of input.boxes.entries()) {
    const entity = normalizeBoxEntity(rawBox);

    if (!entity) {
      return null;
    }

    const hasPlacementList = Object.prototype.hasOwnProperty.call(rawPlacementsByBoxId, entity.id);
    const placements = hasPlacementList
      ? normalizePlacementList(rawPlacementsByBoxId[entity.id])
      : normalizeLegacyItemIdPlacements(isRecord(rawBox) ? rawBox.itemIds : null);

    if (!placements) {
      return null;
    }

    const viewState =
      normalizeViewState(rawViewStatesByBoxId.get(entity.id), index) ??
      normalizeViewState({ ...rawBox, boxId: entity.id }, index);

    if (!viewState) {
      return null;
    }

    boxes.push({
      ...entity,
      itemIds: placements.map((placement) => placement.itemId),
    });
    itemPlacementsByBoxId[entity.id] = placements;
    boxViewStates.push(viewState);
  }

  const items = input.items
    .map(normalizeWorkspaceItem)
    .filter((item): item is WorkspaceItem => item !== null);

  if (items.length !== input.items.length) {
    return null;
  }

  const rawBookmarks = Array.isArray(input.bookmarks) ? input.bookmarks : [];
  const bookmarks = rawBookmarks
    .map(normalizeBookmark)
    .filter((bookmark): bookmark is Bookmark => bookmark !== null);

  if (bookmarks.length !== rawBookmarks.length) {
    return null;
  }

  const rawBookmarkFolders = Array.isArray(input.bookmarkFolders) ? input.bookmarkFolders : [];
  const bookmarkFolders = rawBookmarkFolders
    .map(normalizeBookmarkFolder)
    .filter((folder): folder is BookmarkFolder => folder !== null);

  if (bookmarkFolders.length !== rawBookmarkFolders.length) {
    return null;
  }

  return {
    version: WORKSPACE_EXPORT_VERSION,
    boxes,
    items,
    itemPlacementsByBoxId,
    boxViewStates,
    bookmarks,
    bookmarkFolders,
  };
}

export function parseWorkspaceExportDocument(input: unknown): WorkspaceExportDocumentV5 {
  if (!isRecord(input)) {
    throw new Error('Invalid workspace export document');
  }

  const isSupportedVersion =
    input.version === WORKSPACE_EXPORT_VERSION ||
    LEGACY_WORKSPACE_EXPORT_VERSIONS.has(Number(input.version));
  const exportDocument = isSupportedVersion ? normalizeExportDocument(input) : null;

  if (!exportDocument) {
    throw new Error('Invalid workspace export document');
  }

  return exportDocument;
}

function snapshotFromExportDocument(
  exportDocument: WorkspaceExportDocumentV5,
): WorkspaceSnapshotV7 {
  const boxesById = Object.fromEntries(
    exportDocument.boxes.map((box) => [
      box.id,
      {
        id: box.id,
        customTitle: box.customTitle,
        templateId: box.templateId,
        templateState: box.templateState,
      },
    ]),
  );
  const boxOrder = exportDocument.boxes.map((box) => box.id);
  const boxViewStatesById = Object.fromEntries(
    exportDocument.boxViewStates.map((viewState) => [viewState.boxId, viewState]),
  );
  const itemsById = Object.fromEntries(exportDocument.items.map((item) => [item.id, item]));
  const maxZIndex = Math.max(
    0,
    ...exportDocument.boxViewStates.map((viewState) => viewState.zIndex),
  );

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    boxesById,
    boxOrder,
    boxViewStatesById,
    itemsById,
    itemPlacementsByBoxId: exportDocument.itemPlacementsByBoxId,
    bookmarksById: Object.fromEntries(
      exportDocument.bookmarks.map((bookmark) => [bookmark.id, bookmark]),
    ),
    bookmarkFoldersById: Object.fromEntries(
      exportDocument.bookmarkFolders.map((folder) => [folder.id, folder]),
    ),
    bookmarkFolderOrder: exportDocument.bookmarkFolders.map((folder) => folder.id),
    maxZIndex,
  };
}

function normalizePersistedSnapshot(input: Record<string, unknown>): WorkspaceSnapshotV7 | null {
  const boxesById = isRecord(input.boxesById) ? input.boxesById : null;
  const boxViewStatesById = isRecord(input.boxViewStatesById) ? input.boxViewStatesById : null;
  const rawItemsById = isRecord(input.itemsById) ? input.itemsById : null;
  const rawPlacementsByBoxId = isRecord(input.itemPlacementsByBoxId)
    ? input.itemPlacementsByBoxId
    : null;
  const boxOrder = Array.isArray(input.boxOrder)
    ? input.boxOrder
        .map((boxId) => asString(boxId)?.trim())
        .filter((boxId): boxId is string => !!boxId)
    : null;

  if (!boxesById || !boxViewStatesById || !rawItemsById || !rawPlacementsByBoxId || !boxOrder) {
    return null;
  }

  const normalizedBoxesById: Record<string, WorkspaceBoxEntity> = {};
  const normalizedViewStatesById: Record<string, BoxDesktopViewState> = {};
  const itemPlacementsByBoxId: Record<string, BoxItemPlacement[]> = {};

  for (const [index, boxId] of boxOrder.entries()) {
    const entity = normalizeBoxEntity(boxesById[boxId]);
    const viewState = normalizeViewState(boxViewStatesById[boxId], index);

    if (!entity || !viewState) {
      return null;
    }

    normalizedBoxesById[boxId] = entity;
    normalizedViewStatesById[boxId] = {
      ...viewState,
      isMinimized: false,
    };

    const rawPlacements = Array.isArray(rawPlacementsByBoxId[boxId])
      ? rawPlacementsByBoxId[boxId]
      : [];
    const placements = rawPlacements
      .map(normalizePlacement)
      .filter((placement): placement is BoxItemPlacement => placement !== null);

    if (placements.length !== rawPlacements.length) {
      return null;
    }

    itemPlacementsByBoxId[boxId] = placements;
  }

  const items = Object.values(rawItemsById)
    .map(normalizeWorkspaceItem)
    .filter((item): item is WorkspaceItem => item !== null);

  if (items.length !== Object.values(rawItemsById).length) {
    return null;
  }

  const rawBookmarksById = isRecord(input.bookmarksById) ? input.bookmarksById : {};
  const bookmarks = Object.values(rawBookmarksById)
    .map(normalizeBookmark)
    .filter((bookmark): bookmark is Bookmark => bookmark !== null);

  if (bookmarks.length !== Object.values(rawBookmarksById).length) {
    return null;
  }

  const rawBookmarkFoldersById = isRecord(input.bookmarkFoldersById)
    ? input.bookmarkFoldersById
    : {};
  const bookmarkFolders = Object.values(rawBookmarkFoldersById)
    .map(normalizeBookmarkFolder)
    .filter((folder): folder is BookmarkFolder => folder !== null);

  if (bookmarkFolders.length !== Object.values(rawBookmarkFoldersById).length) {
    return null;
  }

  const bookmarkFoldersById = Object.fromEntries(
    bookmarkFolders.map((folder) => [folder.id, folder]),
  );
  const bookmarkFolderOrder = Array.isArray(input.bookmarkFolderOrder)
    ? input.bookmarkFolderOrder
        .map((folderId) => asString(folderId)?.trim())
        .filter(
          (folderId): folderId is string => !!folderId && Boolean(bookmarkFoldersById[folderId]),
        )
    : bookmarkFolders.map((folder) => folder.id);

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    boxesById: normalizedBoxesById,
    boxOrder,
    boxViewStatesById: normalizedViewStatesById,
    itemsById: Object.fromEntries(items.map((item) => [item.id, item])),
    itemPlacementsByBoxId,
    bookmarksById: Object.fromEntries(bookmarks.map((bookmark) => [bookmark.id, bookmark])),
    bookmarkFoldersById,
    bookmarkFolderOrder: Array.from(new Set(bookmarkFolderOrder)),
    maxZIndex: Math.max(
      asNumber(input.maxZIndex, 0),
      ...Object.values(normalizedViewStatesById).map((viewState) => viewState.zIndex),
    ),
  };
}

export function parseWorkspaceSnapshot(input: unknown): WorkspaceSnapshot | null {
  if (!isRecord(input)) {
    return null;
  }

  return input.schemaVersion === WORKSPACE_SCHEMA_VERSION ||
    LEGACY_WORKSPACE_SCHEMA_VERSIONS.has(Number(input.schemaVersion))
    ? normalizePersistedSnapshot(input)
    : null;
}

export function createWorkspaceSnapshotFromExportDocument(
  document: WorkspaceExportDocumentV5,
): WorkspaceSnapshotV7 {
  return snapshotFromExportDocument(document);
}
