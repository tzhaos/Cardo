import type { WorkspaceItem, WorkspaceItemUpdate } from '../../items/model/item';

export type WorkspaceBoxRole = 'folders' | 'links' | 'notes';
export type BoxLayout = 'grid' | 'list';

export interface WorkspaceBoxBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkspaceBox {
  id: string;
  role: WorkspaceBoxRole | null;
  customTitle: string | null;
  bounds: WorkspaceBoxBounds;
  isLocked: boolean;
  isCollapsed: boolean;
  isMinimized: boolean;
  layout: BoxLayout;
  zIndex: number;
  items: WorkspaceItem[];
}

export interface WorkspaceSnapshotV4 {
  schemaVersion: 4;
  boxesById: Record<string, WorkspaceBox>;
  boxOrder: string[];
  maxZIndex: number;
}

export interface WorkspaceExportDocumentV2 {
  version: 2;
  boxes: WorkspaceBox[];
}

export interface WorkspaceBoxUpdate {
  role?: WorkspaceBoxRole | null;
  customTitle?: string | null;
  bounds?: Partial<WorkspaceBoxBounds>;
  isLocked?: boolean;
  isCollapsed?: boolean;
  isMinimized?: boolean;
  layout?: BoxLayout;
  zIndex?: number;
}

export type WorkspaceCommand =
  | { type: 'workspace.replaceBoxes'; boxes: WorkspaceBox[] }
  | { type: 'workspace.toggleAllBoxesMinimized' }
  | { type: 'box.create'; box: WorkspaceBox }
  | { type: 'box.update'; boxId: string; updates: WorkspaceBoxUpdate }
  | { type: 'box.delete'; boxId: string }
  | { type: 'box.bringToFront'; boxId: string }
  | { type: 'item.add'; boxId: string; item: WorkspaceItem }
  | { type: 'item.update'; boxId: string; itemId: string; updates: WorkspaceItemUpdate }
  | { type: 'item.delete'; boxId: string; itemId: string }
  | { type: 'item.setPinned'; boxId: string; itemId: string; isPinned: boolean }
  | {
      type: 'item.move';
      itemId: string;
      sourceBoxId: string;
      targetBoxId: string;
      targetIndex?: number;
    };

export const WORKSPACE_SCHEMA_VERSION = 4 as const;
export const WORKSPACE_EXPORT_VERSION = 2 as const;
export const SYSTEM_BOX_ROLES: WorkspaceBoxRole[] = ['folders', 'links', 'notes'];
export const MAX_WORKSPACE_BOXES = 12;

/** Minimum visual dimensions for workspace boxes, shared across codec, resize, and migration. */
export const BOX_MIN_WIDTH = 200;
export const BOX_MIN_HEIGHT = 150;
export const BOX_COLLAPSED_HEIGHT = 56;

export function getRenderedBoxBounds(
  box: Pick<WorkspaceBox, 'bounds' | 'isCollapsed'>,
): WorkspaceBoxBounds {
  if (!box.isCollapsed) {
    return box.bounds;
  }

  return {
    ...box.bounds,
    height: BOX_COLLAPSED_HEIGHT,
  };
}

export function isWorkspaceBoxRole(value: unknown): value is WorkspaceBoxRole {
  return typeof value === 'string' && SYSTEM_BOX_ROLES.includes(value as WorkspaceBoxRole);
}
