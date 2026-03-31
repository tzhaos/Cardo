import { createItem } from '../../items/services/createItem';
import { normalizeBoxes } from './boxTitles';
import { createInitialBoxes, DEFAULT_BOX_THEME, getMaxZIndex } from './defaultBoxes';
import {
  createWorkspaceDataState,
  WORKSPACE_STATE_VERSION,
  type WorkspaceDataState,
} from './workspaceState';
import { inferSystemBoxRole, SYSTEM_BOX_ROLES } from './workspaceRoles';
import type { BoxData } from '../../../types/box';
import type { BoxItemData, ItemType } from '../../../types/item';

const VALID_ITEM_TYPES: ItemType[] = ['file', 'folder', 'url', 'note'];
const VALID_LAYOUTS: BoxData['layout'][] = ['grid', 'list'];
const MIN_BOX_WIDTH = 200;
const MIN_BOX_HEIGHT = 150;
const DEFAULT_BOX_WIDTH = 320;
const DEFAULT_BOX_HEIGHT = 400;
const DEFAULT_BOX_X = 100;
const DEFAULT_BOX_Y = 100;

interface NormalizeOptions {
  strict: boolean;
}

export class WorkspaceImportError extends Error {
  constructor(message = 'Invalid workspace import payload') {
    super(message);
    this.name = 'WorkspaceImportError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function getBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function getFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number) {
  return Math.max(minimum, value);
}

function createFallbackBoxId(index: number) {
  return `box-import-${Date.now()}-${index}`;
}

function normalizeItemType(value: unknown) {
  return typeof value === 'string' && VALID_ITEM_TYPES.includes(value as ItemType)
    ? (value as ItemType)
    : null;
}

function normalizeLayout(value: unknown) {
  return typeof value === 'string' && VALID_LAYOUTS.includes(value as BoxData['layout'])
    ? (value as BoxData['layout'])
    : null;
}

function normalizeSystemBoxRole(value: unknown) {
  return typeof value === 'string' && SYSTEM_BOX_ROLES.includes(value as BoxData['role'] & string)
    ? (value as NonNullable<BoxData['role']>)
    : null;
}

function normalizeItem(input: unknown, index: number, options: NormalizeOptions): BoxItemData | null {
  if (!isRecord(input)) {
    if (options.strict) {
      throw new WorkspaceImportError(`Invalid item at index ${index}`);
    }

    return null;
  }

  const type = normalizeItemType(input.type);
  const content = getString(input.content)?.trim() ?? '';

  if (!type || !content) {
    if (options.strict) {
      throw new WorkspaceImportError(`Invalid item payload at index ${index}`);
    }

    return null;
  }

  const createdItem = createItem({
    type,
    title: getString(input.title) ?? undefined,
    content,
    isPinned: getBoolean(input.isPinned),
  });

  return {
    ...createdItem,
    id: getString(input.id)?.trim() || createdItem.id,
  };
}

function normalizeBox(input: unknown, index: number, options: NormalizeOptions): BoxData | null {
  if (!isRecord(input)) {
    if (options.strict) {
      throw new WorkspaceImportError(`Invalid box at index ${index}`);
    }

    return null;
  }

  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems
    .map((item, itemIndex) => normalizeItem(item, itemIndex, options))
    .filter((item): item is BoxItemData => item !== null);
  const normalizedId = getString(input.id)?.trim() || createFallbackBoxId(index);

  const normalizedBox: BoxData = {
    id: normalizedId,
    role: inferSystemBoxRole({
      id: normalizedId,
      role: normalizeSystemBoxRole(getString(input.role)?.trim()),
    }),
    title: getString(input.title)?.trim() ?? '',
    titleKey: getString(input.titleKey)?.trim() ?? null,
    x: getFiniteNumber(input.x, DEFAULT_BOX_X + index * 40),
    y: getFiniteNumber(input.y, DEFAULT_BOX_Y + index * 40),
    width: clamp(getFiniteNumber(input.width, DEFAULT_BOX_WIDTH), MIN_BOX_WIDTH),
    height: clamp(getFiniteNumber(input.height, DEFAULT_BOX_HEIGHT), MIN_BOX_HEIGHT),
    theme: getString(input.theme)?.trim() || DEFAULT_BOX_THEME,
    isLocked: getBoolean(input.isLocked),
    isMinimized: getBoolean(input.isMinimized),
    layout: normalizeLayout(input.layout) ?? 'list',
    items,
    zIndex: Math.max(0, Math.round(getFiniteNumber(input.zIndex, index + 1))),
  };

  return normalizedBox;
}

function finalizeBoxes(boxes: BoxData[]) {
  return normalizeBoxes(boxes);
}

function parseImportedBoxes(input: unknown) {
  if (Array.isArray(input)) {
    return input;
  }

  if (isRecord(input) && Array.isArray(input.boxes)) {
    return input.boxes;
  }

  throw new WorkspaceImportError('Workspace import must be an array or versioned payload');
}

export function parseImportedWorkspaceBoxes(input: unknown) {
  const rawBoxes = parseImportedBoxes(input);

  return finalizeBoxes(
    rawBoxes.map((box, index) => {
      const normalizedBox = normalizeBox(box, index, { strict: true });

      if (!normalizedBox) {
        throw new WorkspaceImportError(`Invalid box at index ${index}`);
      }

      return normalizedBox;
    }),
  );
}

function normalizeLegacyWorkspaceState(input: Record<string, unknown>) {
  const fallbackBoxes = createInitialBoxes();
  const rawBoxes = Array.isArray(input.boxes) ? input.boxes : fallbackBoxes;
  const boxes = finalizeBoxes(
    rawBoxes
      .map((box, index) => normalizeBox(box, index, { strict: false }))
      .filter((box): box is BoxData => box !== null),
  );

  if (boxes.length === 0 && rawBoxes !== fallbackBoxes) {
    return createWorkspaceDataState(fallbackBoxes, WORKSPACE_STATE_VERSION);
  }

  const safeBoxes = boxes.length > 0 || rawBoxes === fallbackBoxes ? boxes : fallbackBoxes;

  return {
    ...createWorkspaceDataState(safeBoxes, WORKSPACE_STATE_VERSION),
    maxZIndex: Math.max(getFiniteNumber(input.maxZIndex, getMaxZIndex(safeBoxes)), getMaxZIndex(safeBoxes)),
  };
}

function normalizeVersionedWorkspaceState(input: Record<string, unknown>): WorkspaceDataState | null {
  const version = getFiniteNumber(input.version, 0);

  if (version < WORKSPACE_STATE_VERSION) {
    return null;
  }

  const boxesByIdInput = isRecord(input.boxesById) ? input.boxesById : null;
  const boxOrderInput = Array.isArray(input.boxOrder) ? input.boxOrder : null;

  if (!boxesByIdInput || !boxOrderInput) {
    return null;
  }

  const orderedBoxes = boxOrderInput
    .map((boxId, index) => {
      const normalizedBoxId = getString(boxId)?.trim();

      if (!normalizedBoxId) {
        return null;
      }

      return normalizeBox(boxesByIdInput[normalizedBoxId], index, { strict: false });
    })
    .filter((box): box is BoxData => box !== null);

  return {
    ...createWorkspaceDataState(finalizeBoxes(orderedBoxes), WORKSPACE_STATE_VERSION),
    maxZIndex: Math.max(
      getFiniteNumber(input.maxZIndex, getMaxZIndex(orderedBoxes)),
      getMaxZIndex(orderedBoxes),
    ),
  };
}

export function normalizePersistedWorkspaceSnapshot(input: unknown): WorkspaceDataState {
  const fallbackBoxes = createInitialBoxes();

  if (!isRecord(input)) {
    return createWorkspaceDataState(fallbackBoxes, WORKSPACE_STATE_VERSION);
  }

  return (
    normalizeVersionedWorkspaceState(input) ??
    normalizeLegacyWorkspaceState(input)
  );
}
