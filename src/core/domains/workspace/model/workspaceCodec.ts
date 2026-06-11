import { createWorkspaceItem, type WorkspaceItem } from '../../items/model/item';
import {
  BOX_MIN_HEIGHT,
  BOX_MIN_WIDTH,
  WORKSPACE_EXPORT_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  type BoxDesktopViewState,
  type BoxItemPlacement,
  type WorkspaceBoxEntity,
  type WorkspaceExportBoxV3,
  type WorkspaceExportDocumentV3,
  type WorkspaceSnapshot,
  type WorkspaceSnapshotV5,
} from './workspace';

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

  return createWorkspaceItem(id, {
    type: type as WorkspaceItem['type'],
    content,
    title: asString(input.title)?.trim() || null,
  });
}

function normalizeBoxEntity(input: unknown): WorkspaceBoxEntity | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = asString(input.id)?.trim();

  if (!id || 'role' in input) {
    return null;
  }

  return {
    id,
    customTitle: asString(input.customTitle)?.trim() || null,
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
    layout: asString(input.layout) === 'grid' ? 'grid' : 'list',
    zIndex: Math.max(0, Math.round(asNumber(input.zIndex, index + 1))),
  };
}

function normalizePlacement(input: unknown): BoxItemPlacement | null {
  if (!isRecord(input)) {
    return null;
  }

  const itemId = asString(input.itemId)?.trim();

  return itemId
    ? {
        itemId,
        isPinned: asBoolean(input.isPinned),
      }
    : null;
}

function createExportDocumentFromSnapshot(
  snapshot: Pick<
    WorkspaceSnapshotV5,
    'boxesById' | 'boxOrder' | 'boxViewStatesById' | 'itemsById' | 'itemPlacementsByBoxId'
  >,
): WorkspaceExportDocumentV3 {
  const boxes: WorkspaceExportBoxV3[] = snapshot.boxOrder
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
  };
}

export function createWorkspaceExportDocument(
  snapshot: Pick<
    WorkspaceSnapshotV5,
    'boxesById' | 'boxOrder' | 'boxViewStatesById' | 'itemsById' | 'itemPlacementsByBoxId'
  >,
): WorkspaceExportDocumentV3 {
  return createExportDocumentFromSnapshot(snapshot);
}

function normalizeExportDocumentV3(
  input: Record<string, unknown>,
): WorkspaceExportDocumentV3 | null {
  if (!Array.isArray(input.boxes) || !Array.isArray(input.items)) {
    return null;
  }

  const boxes: WorkspaceExportBoxV3[] = [];
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

    const rawPlacements: unknown[] = Array.isArray(rawPlacementsByBoxId[entity.id])
      ? (rawPlacementsByBoxId[entity.id] as unknown[])
      : [];
    const placements = rawPlacements
      .map(normalizePlacement)
      .filter((placement): placement is BoxItemPlacement => placement !== null);

    if (placements.length !== rawPlacements.length) {
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

  return {
    version: WORKSPACE_EXPORT_VERSION,
    boxes,
    items,
    itemPlacementsByBoxId,
    boxViewStates,
  };
}

/** Validates and normalizes a JSON export file. */
export function parseWorkspaceExportDocument(input: unknown): WorkspaceExportDocumentV3 {
  if (!isRecord(input)) {
    throw new Error('Invalid workspace export document');
  }

  const exportDocument =
    input.version === WORKSPACE_EXPORT_VERSION ? normalizeExportDocumentV3(input) : null;

  if (!exportDocument) {
    throw new Error('Invalid workspace export document');
  }

  return exportDocument;
}

function snapshotFromExportDocument(
  exportDocument: WorkspaceExportDocumentV3,
): WorkspaceSnapshotV5 {
  const boxesById = Object.fromEntries(
    exportDocument.boxes.map((box) => [
      box.id,
      {
        id: box.id,
        customTitle: box.customTitle,
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
    maxZIndex,
  };
}

function normalizePersistedSnapshotV5(input: Record<string, unknown>): WorkspaceSnapshotV5 | null {
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
    normalizedViewStatesById[boxId] = viewState;

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

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    boxesById: normalizedBoxesById,
    boxOrder,
    boxViewStatesById: normalizedViewStatesById,
    itemsById: Object.fromEntries(items.map((item) => [item.id, item])),
    itemPlacementsByBoxId,
    maxZIndex: Math.max(
      asNumber(input.maxZIndex, 0),
      ...Object.values(normalizedViewStatesById).map((viewState) => viewState.zIndex),
    ),
  };
}

/** Accepts persisted storage state for the workspace store. */
export function parseWorkspaceSnapshot(input: unknown): WorkspaceSnapshot | null {
  if (!isRecord(input)) {
    return null;
  }

  return input.schemaVersion === WORKSPACE_SCHEMA_VERSION
    ? normalizePersistedSnapshotV5(input)
    : null;
}

export function createWorkspaceSnapshotFromExportDocument(
  document: WorkspaceExportDocumentV3,
): WorkspaceSnapshotV5 {
  return snapshotFromExportDocument(document);
}
