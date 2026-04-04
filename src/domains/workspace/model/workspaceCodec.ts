import { createWorkspaceSnapshot } from './createInitialWorkspaceSnapshot';
import type { WorkspaceItem } from '../../items/model/item';
import {
  WORKSPACE_EXPORT_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  isWorkspaceBoxRole,
  type WorkspaceBox,
  type WorkspaceExportDocumentV2,
  type WorkspaceSnapshotV3,
} from './workspace';

const MIN_BOX_WIDTH = 200;
const MIN_BOX_HEIGHT = 150;

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

function normalizeItem(input: unknown): WorkspaceItem | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = asString(input.id)?.trim();
  const type = asString(input.type)?.trim();
  const title = asString(input.title)?.trim();
  const content = asString(input.content)?.trim();

  if (!id || !title || !content || !type) {
    return null;
  }

  if (!['file', 'folder', 'url', 'note'].includes(type)) {
    return null;
  }

  return {
    id,
    type: type as WorkspaceItem['type'],
    title,
    content,
    isPinned: asBoolean(input.isPinned),
  };
}

function normalizeBox(input: unknown, index: number): WorkspaceBox | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = asString(input.id)?.trim();

  if (!id) {
    return null;
  }

  const role = input.role === null || input.role === undefined ? null : asString(input.role)?.trim();
  const rawBounds = isRecord(input.bounds) ? input.bounds : {};
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems
    .map(normalizeItem)
    .filter((item): item is WorkspaceItem => item !== null);

  return {
    id,
    role: role && isWorkspaceBoxRole(role) ? role : null,
    customTitle: asString(input.customTitle)?.trim() || null,
    bounds: {
      x: asNumber(rawBounds.x, 100 + index * 40),
      y: asNumber(rawBounds.y, 100 + index * 40),
      width: Math.max(MIN_BOX_WIDTH, asNumber(rawBounds.width, 320)),
      height: Math.max(MIN_BOX_HEIGHT, asNumber(rawBounds.height, 400)),
    },
    isLocked: asBoolean(input.isLocked),
    isMinimized: asBoolean(input.isMinimized),
    layout: asString(input.layout) === 'grid' ? 'grid' : 'list',
    zIndex: Math.max(0, Math.round(asNumber(input.zIndex, index + 1))),
    items,
  };
}

export function createWorkspaceExportDocument(
  snapshot: Pick<WorkspaceSnapshotV3, 'boxesById' | 'boxOrder'>,
): WorkspaceExportDocumentV2 {
  return {
    version: WORKSPACE_EXPORT_VERSION,
    boxes: snapshot.boxOrder
      .map((boxId) => snapshot.boxesById[boxId])
      .filter((box): box is WorkspaceBox => Boolean(box)),
  };
}

export function parseWorkspaceExportDocument(input: unknown) {
  if (!isRecord(input) || input.version !== WORKSPACE_EXPORT_VERSION || !Array.isArray(input.boxes)) {
    throw new Error('Invalid workspace export document');
  }

  const boxes = input.boxes
    .map((box, index) => normalizeBox(box, index))
    .filter((box): box is WorkspaceBox => box !== null);

  if (boxes.length !== input.boxes.length) {
    throw new Error('Invalid workspace export document');
  }

  return {
    version: WORKSPACE_EXPORT_VERSION,
    boxes,
  } satisfies WorkspaceExportDocumentV2;
}

export function parseWorkspaceSnapshot(input: unknown): WorkspaceSnapshotV3 | null {
  if (!isRecord(input) || input.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    return null;
  }

  const boxesById = isRecord(input.boxesById) ? input.boxesById : null;
  const boxOrder = Array.isArray(input.boxOrder) ? input.boxOrder : null;

  if (!boxesById || !boxOrder) {
    return null;
  }

  const orderedBoxes = boxOrder
    .map((boxId, index) => {
      const normalizedId = asString(boxId)?.trim();
      return normalizedId ? normalizeBox(boxesById[normalizedId], index) : null;
    })
    .filter((box): box is WorkspaceBox => box !== null);

  const snapshot = createWorkspaceSnapshot(orderedBoxes);

  return {
    ...snapshot,
    maxZIndex: Math.max(asNumber(input.maxZIndex, snapshot.maxZIndex), snapshot.maxZIndex),
  };
}
