import { MESSAGES } from '../../domains/i18n/model/messages';
import { deriveItemTitle } from '../../domains/items/services/deriveItemTitle';
import { createWorkspaceSnapshot } from '../../domains/workspace/model/createInitialWorkspaceSnapshot';
import {
  BOX_MIN_HEIGHT,
  BOX_MIN_WIDTH,
  WORKSPACE_EXPORT_VERSION,
  type WorkspaceBox,
  type WorkspaceBoxRole,
  type WorkspaceExportDocumentV2,
} from '../../domains/workspace/model/workspace';

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

function normalizeLegacyItem(input: unknown, index: number, boxIndex: number) {
  if (!isRecord(input)) {
    return null;
  }

  const type = asString(input.type)?.trim();
  const content = asString(input.content)?.trim() ?? '';

  if (!type || !content || !['file', 'folder', 'url', 'note'].includes(type)) {
    return null;
  }

  return {
    id: asString(input.id)?.trim() || `migrated-item-${boxIndex}-${index}`,
    type: type as 'file' | 'folder' | 'url' | 'note',
    title:
      asString(input.title)?.trim() ||
      deriveItemTitle(type as 'file' | 'folder' | 'url' | 'note', content),
    content,
    isPinned: asBoolean(input.isPinned),
  };
}

function normalizeLegacyBox(input: unknown, index: number): WorkspaceBox | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = asString(input.id)?.trim() || `migrated-box-${index}`;
  const role = inferRole(input);
  const rawBounds = isRecord(input.bounds) ? input.bounds : {};
  const items = (Array.isArray(input.items) ? input.items : [])
    .map((item, itemIndex) => normalizeLegacyItem(item, itemIndex, index))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const legacyTitle = asString(input.customTitle)?.trim() ?? asString(input.title)?.trim() ?? null;

  return {
    id,
    role,
    customTitle: normalizeCustomTitle(legacyTitle, role),
    bounds: {
      x: asNumber(rawBounds.x ?? input.x, 100 + index * 40),
      y: asNumber(rawBounds.y ?? input.y, 100 + index * 40),
      width: Math.max(BOX_MIN_WIDTH, asNumber(rawBounds.width ?? input.width, 320)),
      height: Math.max(BOX_MIN_HEIGHT, asNumber(rawBounds.height ?? input.height, 400)),
    },
    isLocked: asBoolean(input.isLocked),
    isMinimized: asBoolean(input.isMinimized),
    layout: asString(input.layout) === 'grid' ? 'grid' : 'list',
    zIndex: Math.max(0, Math.round(asNumber(input.zIndex, index + 1))),
    items,
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

export function migrateLegacyWorkspaceDocument(input: unknown): WorkspaceExportDocumentV2 {
  const boxes = extractLegacyBoxes(input)
    .map((box, index) => normalizeLegacyBox(box, index))
    .filter((box): box is WorkspaceBox => box !== null);

  return {
    version: WORKSPACE_EXPORT_VERSION,
    boxes,
  };
}

export function migrateLegacyWorkspaceSnapshot(input: unknown) {
  return createWorkspaceSnapshot(migrateLegacyWorkspaceDocument(input).boxes);
}
