import { MESSAGES } from '../domains/i18n/model/messages';
import { createWorkspaceItem, type WorkspaceItem } from '../domains/items/model/item';
import {
  BOX_MIN_HEIGHT,
  BOX_MIN_WIDTH,
  WORKSPACE_EXPORT_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  type BoxDesktopViewState,
  type BoxItemPlacement,
  type WorkspaceExportBoxV3,
  type WorkspaceExportDocumentV3,
  type WorkspaceSnapshotV5,
} from '../domains/workspace/model/workspace';

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

type LegacyRole = 'folders' | 'links' | 'notes';

const LEGACY_ROLE_BY_ID: Record<string, LegacyRole> = {
  folders: 'folders',
  webpages: 'links',
  clipboard: 'notes',
  'system-folders': 'folders',
  'system-links': 'links',
  'system-notes': 'notes',
};

const SYSTEM_TITLE_LOOKUP: Record<LegacyRole, Set<string>> = {
  folders: new Set(Object.values(MESSAGES).map((dictionary) => dictionary['box.folders'])),
  links: new Set(Object.values(MESSAGES).map((dictionary) => dictionary['box.links'])),
  notes: new Set(Object.values(MESSAGES).map((dictionary) => dictionary['box.notes'])),
};

const LEGACY_ROLE_TITLES: Record<LegacyRole, string> = {
  folders: 'Folders',
  links: 'Links',
  notes: 'Notes',
};

const NEW_BOX_TITLES = new Set(Object.values(MESSAGES).map((dictionary) => dictionary['box.new']));

function inferLegacyRole(input: Record<string, unknown>): LegacyRole | null {
  const role = asString(input.role)?.trim();

  if (role === 'folders' || role === 'links' || role === 'notes') {
    return role;
  }

  const id = asString(input.id)?.trim() ?? '';
  return LEGACY_ROLE_BY_ID[id] ?? null;
}

function normalizeCustomTitle(title: string | null, legacyRole: LegacyRole | null) {
  if (title && legacyRole && SYSTEM_TITLE_LOOKUP[legacyRole].has(title)) {
    return null;
  }

  if (title && !legacyRole && NEW_BOX_TITLES.has(title)) {
    return null;
  }

  return title;
}

function resolveBoxTitle(rawTitle: string | null, legacyRole: LegacyRole | null): string | null {
  const normalized = normalizeCustomTitle(rawTitle, legacyRole);
  if (normalized) {
    return normalized;
  }
  return legacyRole ? LEGACY_ROLE_TITLES[legacyRole] : null;
}

function normalizeLegacyItem(
  input: unknown,
  index: number,
  boxIndex: number,
): { item: WorkspaceItem; placement: BoxItemPlacement } | null {
  if (!isRecord(input)) {
    return null;
  }

  const type = asString(input.type)?.trim();
  const content =
    type === 'url'
      ? asString(input.url)?.trim() || asString(input.content)?.trim()
      : type === 'note'
        ? asString(input.text)?.trim() || asString(input.content)?.trim()
        : asString(input.path)?.trim() || asString(input.content)?.trim();

  if (!type || !content || !['file', 'folder', 'url', 'note'].includes(type)) {
    return null;
  }

  const item = createWorkspaceItem(
    asString(input.id)?.trim() || `migrated-item-${boxIndex}-${index}`,
    {
      type: type as WorkspaceItem['type'],
      content,
      title: asString(input.title)?.trim() || null,
    },
  );

  return {
    item,
    placement: {
      itemId: item.id,
      isPinned: asBoolean(input.isPinned),
    },
  };
}

function normalizeCurrentExportItem(input: unknown): WorkspaceItem | null {
  if (!isRecord(input)) {
    return null;
  }

  const type = asString(input.type)?.trim();
  const content =
    type === 'url'
      ? asString(input.url)?.trim() || asString(input.content)?.trim()
      : type === 'note'
        ? asString(input.text)?.trim() || asString(input.content)?.trim()
        : asString(input.path)?.trim() || asString(input.content)?.trim();

  if (!type || !content || !['file', 'folder', 'url', 'note', 'shortcut'].includes(type)) {
    return null;
  }

  return createWorkspaceItem(asString(input.id)?.trim() || `migrated-item-${Date.now()}`, {
    type: type as WorkspaceItem['type'],
    content,
    title: asString(input.title)?.trim() || null,
  });
}

function normalizePlacement(input: unknown): BoxItemPlacement | null {
  if (!isRecord(input)) {
    return null;
  }

  const itemId = asString(input.itemId)?.trim();

  if (!itemId) {
    return null;
  }

  return {
    itemId,
    isPinned: asBoolean(input.isPinned),
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

function migrateCurrentExportDocument(input: Record<string, unknown>): WorkspaceExportDocumentV3 {
  const rawBoxes = Array.isArray(input.boxes) ? input.boxes : [];
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const rawPlacementsByBoxId = isRecord(input.itemPlacementsByBoxId)
    ? input.itemPlacementsByBoxId
    : {};
  const rawViewStates = Array.isArray(input.boxViewStates) ? input.boxViewStates : [];
  const rawViewStateByBoxId = new Map<string, unknown>();

  for (const rawViewState of rawViewStates) {
    if (isRecord(rawViewState) && typeof rawViewState.boxId === 'string') {
      rawViewStateByBoxId.set(rawViewState.boxId, rawViewState);
    }
  }

  const boxes: WorkspaceExportBoxV3[] = [];
  const itemPlacementsByBoxId: Record<string, BoxItemPlacement[]> = {};
  const boxViewStates: BoxDesktopViewState[] = [];

  for (const [boxIndex, rawBox] of rawBoxes.entries()) {
    if (!isRecord(rawBox)) {
      continue;
    }

    const id = asString(rawBox.id)?.trim() || `migrated-box-${boxIndex}`;
    const legacyRole = inferLegacyRole(rawBox);
    const placements = Array.isArray(rawPlacementsByBoxId[id])
      ? (rawPlacementsByBoxId[id] as unknown[])
          .map(normalizePlacement)
          .filter((placement): placement is BoxItemPlacement => Boolean(placement))
      : [];

    boxes.push({
      id,
      customTitle: resolveBoxTitle(asString(rawBox.customTitle)?.trim() || null, legacyRole),
      itemIds: placements.map((placement) => placement.itemId),
    });
    itemPlacementsByBoxId[id] = placements;

    const viewState = normalizeViewState(rawViewStateByBoxId.get(id), boxIndex);
    if (viewState) {
      boxViewStates.push(viewState);
    }
  }

  const items = rawItems
    .map(normalizeCurrentExportItem)
    .filter((item): item is WorkspaceItem => Boolean(item));

  return {
    version: WORKSPACE_EXPORT_VERSION,
    boxes,
    items,
    itemPlacementsByBoxId,
    boxViewStates,
  };
}

function extractLegacyBoxes(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (isRecord(input) && Array.isArray(input.boxes)) {
    return input.boxes;
  }

  if (isRecord(input) && isRecord(input.boxesById) && Array.isArray(input.boxOrder)) {
    const boxesById = input.boxesById;
    return input.boxOrder
      .map((boxId) => {
        const normalizedId = asString(boxId)?.trim();
        return normalizedId ? boxesById[normalizedId] : null;
      })
      .filter((box): box is unknown => box !== null);
  }

  throw new Error('Unsupported workspace input for migration');
}

export function migrateLegacyWorkspaceDocument(input: unknown): WorkspaceExportDocumentV3 {
  if (isRecord(input) && input.version === WORKSPACE_EXPORT_VERSION && Array.isArray(input.items)) {
    return migrateCurrentExportDocument(input);
  }

  const boxes: WorkspaceExportBoxV3[] = [];
  const itemsById: Record<string, WorkspaceItem> = {};
  const itemPlacementsByBoxId: Record<string, BoxItemPlacement[]> = {};
  const boxViewStates: BoxDesktopViewState[] = [];

  for (const [boxIndex, rawBox] of extractLegacyBoxes(input).entries()) {
    if (!isRecord(rawBox)) {
      continue;
    }

    const id = asString(rawBox.id)?.trim() || `migrated-box-${boxIndex}`;
    const legacyRole = inferLegacyRole(rawBox);
    const rawBounds = isRecord(rawBox.bounds) ? rawBox.bounds : {};
    const placements: BoxItemPlacement[] = [];

    for (const [itemIndex, rawItem] of (Array.isArray(rawBox.items)
      ? rawBox.items
      : []
    ).entries()) {
      const normalizedItem = normalizeLegacyItem(rawItem, itemIndex, boxIndex);

      if (!normalizedItem) {
        continue;
      }

      itemsById[normalizedItem.item.id] = normalizedItem.item;
      placements.push(normalizedItem.placement);
    }

    boxes.push({
      id,
      customTitle: resolveBoxTitle(
        asString(rawBox.customTitle)?.trim() ?? asString(rawBox.title)?.trim() ?? null,
        legacyRole,
      ),
      itemIds: placements.map((placement) => placement.itemId),
    });
    itemPlacementsByBoxId[id] = placements;
    boxViewStates.push({
      boxId: id,
      bounds: {
        x: asNumber(rawBounds.x ?? rawBox.x, 100 + boxIndex * 40),
        y: asNumber(rawBounds.y ?? rawBox.y, 100 + boxIndex * 40),
        width: Math.max(BOX_MIN_WIDTH, asNumber(rawBounds.width ?? rawBox.width, 320)),
        height: Math.max(BOX_MIN_HEIGHT, asNumber(rawBounds.height ?? rawBox.height, 400)),
      },
      isLocked: asBoolean(rawBox.isLocked),
      isCollapsed: asBoolean(rawBox.isCollapsed),
      isMinimized: asBoolean(rawBox.isMinimized),
      layout: asString(rawBox.layout) === 'grid' ? 'grid' : 'list',
      zIndex: Math.max(0, Math.round(asNumber(rawBox.zIndex, boxIndex + 1))),
    });
  }

  return {
    version: WORKSPACE_EXPORT_VERSION,
    boxes,
    items: Object.values(itemsById),
    itemPlacementsByBoxId,
    boxViewStates,
  };
}

export function migrateLegacyWorkspaceSnapshot(input: unknown): WorkspaceSnapshotV5 {
  const exportDocument = migrateLegacyWorkspaceDocument(input);
  const boxViewStatesById = Object.fromEntries(
    exportDocument.boxViewStates.map((viewState) => [viewState.boxId, viewState]),
  );

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    boxesById: Object.fromEntries(
      exportDocument.boxes.map((box) => [
        box.id,
        {
          id: box.id,
          customTitle: box.customTitle,
        },
      ]),
    ),
    boxOrder: exportDocument.boxes.map((box) => box.id),
    boxViewStatesById,
    itemsById: Object.fromEntries(exportDocument.items.map((item) => [item.id, item])),
    itemPlacementsByBoxId: exportDocument.itemPlacementsByBoxId,
    maxZIndex: Math.max(0, ...exportDocument.boxViewStates.map((viewState) => viewState.zIndex)),
  };
}
