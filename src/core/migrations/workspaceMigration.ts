import { MESSAGES } from '../domains/i18n/model/messages';
import { createWorkspaceItem, type WorkspaceItem } from '../domains/items/model/item';
import {
  BOX_MIN_HEIGHT,
  BOX_MIN_WIDTH,
  WORKSPACE_EXPORT_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  type BoxDesktopViewState,
  type BoxItemPlacement,
  type WorkspaceBoxRole,
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

const LEGACY_ROLE_BY_ID: Record<string, WorkspaceBoxRole> = {
  folders: 'folders',
  webpages: 'links',
  clipboard: 'notes',
  'system-folders': 'folders',
  'system-links': 'links',
  'system-notes': 'notes',
};

const SYSTEM_TITLE_LOOKUP: Record<WorkspaceBoxRole, Set<string>> = {
  folders: new Set(Object.values(MESSAGES).map((dictionary) => dictionary['box.folders'])),
  links: new Set(Object.values(MESSAGES).map((dictionary) => dictionary['box.links'])),
  notes: new Set(Object.values(MESSAGES).map((dictionary) => dictionary['box.notes'])),
};

const NEW_BOX_TITLES = new Set(Object.values(MESSAGES).map((dictionary) => dictionary['box.new']));

function inferRole(input: Record<string, unknown>) {
  const role = asString(input.role)?.trim();

  if (role === 'folders' || role === 'links' || role === 'notes') {
    return role;
  }

  const id = asString(input.id)?.trim() ?? '';
  return LEGACY_ROLE_BY_ID[id] ?? null;
}

function normalizeCustomTitle(title: string | null, role: WorkspaceBoxRole | null) {
  if (!title) {
    return null;
  }

  if (role && SYSTEM_TITLE_LOOKUP[role].has(title)) {
    return null;
  }

  if (!role && NEW_BOX_TITLES.has(title)) {
    return null;
  }

  return title;
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
  const boxes: WorkspaceExportBoxV3[] = [];
  const itemsById: Record<string, WorkspaceItem> = {};
  const itemPlacementsByBoxId: Record<string, BoxItemPlacement[]> = {};
  const boxViewStates: BoxDesktopViewState[] = [];

  for (const [boxIndex, rawBox] of extractLegacyBoxes(input).entries()) {
    if (!isRecord(rawBox)) {
      continue;
    }

    const id = asString(rawBox.id)?.trim() || `migrated-box-${boxIndex}`;
    const role = inferRole(rawBox);
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
      role,
      customTitle: normalizeCustomTitle(
        asString(rawBox.customTitle)?.trim() ?? asString(rawBox.title)?.trim() ?? null,
        role,
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
          role: box.role,
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
