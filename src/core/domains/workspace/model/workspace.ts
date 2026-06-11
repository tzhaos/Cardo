import type {
  PlacedWorkspaceItem,
  WorkspaceItem,
  WorkspaceItemUpdate,
} from '../../items/model/item';

export type BoxLayout = 'grid' | 'list';

export interface WorkspaceBoxBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkspaceBoxEntity {
  id: string;
  customTitle: string | null;
}

export interface BoxDesktopViewState {
  boxId: string;
  bounds: WorkspaceBoxBounds;
  isLocked: boolean;
  isCollapsed: boolean;
  isMinimized: boolean;
  layout: BoxLayout;
  zIndex: number;
}

export interface BoxItemPlacement {
  itemId: string;
  isPinned: boolean;
}

export type WorkspaceBox = WorkspaceBoxEntity & Omit<BoxDesktopViewState, 'boxId'>;

export interface WorkspaceBoxWithItems extends WorkspaceBox {
  items: PlacedWorkspaceItem[];
}

export interface WorkspaceSnapshotV5 {
  schemaVersion: 5;
  boxesById: Record<string, WorkspaceBoxEntity>;
  boxOrder: string[];
  boxViewStatesById: Record<string, BoxDesktopViewState>;
  itemsById: Record<string, WorkspaceItem>;
  itemPlacementsByBoxId: Record<string, BoxItemPlacement[]>;
  maxZIndex: number;
}

export type WorkspaceSnapshot = WorkspaceSnapshotV5;

export interface WorkspaceExportBoxV3 extends WorkspaceBoxEntity {
  itemIds: string[];
}

export interface WorkspaceExportDocumentV3 {
  version: 3;
  boxes: WorkspaceExportBoxV3[];
  items: WorkspaceItem[];
  itemPlacementsByBoxId: Record<string, BoxItemPlacement[]>;
  boxViewStates: BoxDesktopViewState[];
}

export interface WorkspaceBoxUpdate {
  customTitle?: string | null;
  bounds?: Partial<WorkspaceBoxBounds>;
  isLocked?: boolean;
  isCollapsed?: boolean;
  isMinimized?: boolean;
  layout?: BoxLayout;
  zIndex?: number;
}

export type WorkspaceCommand =
  | { type: 'workspace.replace'; snapshot: WorkspaceSnapshotV5 }
  | { type: 'workspace.replaceBoxes'; boxes: WorkspaceBoxWithItems[] }
  | { type: 'workspace.toggleAllBoxesMinimized' }
  | { type: 'box.create'; box: WorkspaceBox; placements?: BoxItemPlacement[] }
  | { type: 'box.update'; boxId: string; updates: WorkspaceBoxUpdate }
  | { type: 'box.delete'; boxId: string }
  | { type: 'box.bringToFront'; boxId: string }
  | { type: 'item.add'; boxId: string; item: WorkspaceItem; isPinned?: boolean }
  | { type: 'item.update'; boxId?: string; itemId: string; updates: WorkspaceItemUpdate }
  | { type: 'item.delete'; boxId?: string; itemId: string }
  | { type: 'item.setPinned'; boxId: string; itemId: string; isPinned: boolean }
  | {
      type: 'item.move';
      itemId: string;
      sourceBoxId: string;
      targetBoxId: string;
      targetIndex?: number;
    };

export const WORKSPACE_SCHEMA_VERSION = 5 as const;
export const WORKSPACE_EXPORT_VERSION = 3 as const;
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
