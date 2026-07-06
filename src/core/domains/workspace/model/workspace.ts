import type {
  PlacedWorkspaceItem,
  WorkspaceItem,
  WorkspaceItemUpdate,
} from '../../items/model/item';
import type { Bookmark, BookmarkFolder } from '../../bookmarks/model/bookmark';

export type BoxLayout = 'grid' | 'list';

export const BOX_TEMPLATE_IDS = [
  'collection',
  'web-library',
  'frequent-sites',
  'reading-list',
  'project-board',
  'daily-desk',
  'kanban',
  'launcher',
  'inbox',
] as const;
export type BoxTemplateId = (typeof BOX_TEMPLATE_IDS)[number];
export type KanbanTemplateId = Extract<BoxTemplateId, 'kanban' | 'project-board' | 'daily-desk'>;

const KANBAN_TEMPLATE_ID_SET = new Set<BoxTemplateId>(['kanban', 'project-board', 'daily-desk']);

export function isKanbanTemplateId(templateId: BoxTemplateId): templateId is KanbanTemplateId {
  return KANBAN_TEMPLATE_ID_SET.has(templateId);
}

export interface KanbanColumn {
  id: string;
  title: string;
}

export interface WorkspaceBoxTemplateState {
  kanbanColumns?: KanbanColumn[];
}

export interface WorkspaceBoxBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkspaceBoxEntity {
  id: string;
  customTitle: string | null;
  templateId: BoxTemplateId;
  templateState: WorkspaceBoxTemplateState;
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
  columnId?: string;
}

export type WorkspaceBox = WorkspaceBoxEntity & Omit<BoxDesktopViewState, 'boxId'>;

export interface WorkspaceBoxWithItems extends WorkspaceBox {
  items: PlacedWorkspaceItem[];
}

export interface WorkspaceSnapshotV6 {
  schemaVersion: 6;
  boxesById: Record<string, WorkspaceBoxEntity>;
  boxOrder: string[];
  boxViewStatesById: Record<string, BoxDesktopViewState>;
  itemsById: Record<string, WorkspaceItem>;
  itemPlacementsByBoxId: Record<string, BoxItemPlacement[]>;
  maxZIndex: number;
}

export interface WorkspaceSnapshotV7 {
  schemaVersion: 7;
  boxesById: Record<string, WorkspaceBoxEntity>;
  boxOrder: string[];
  boxViewStatesById: Record<string, BoxDesktopViewState>;
  itemsById: Record<string, WorkspaceItem>;
  itemPlacementsByBoxId: Record<string, BoxItemPlacement[]>;
  bookmarksById: Record<string, Bookmark>;
  bookmarkFoldersById: Record<string, BookmarkFolder>;
  bookmarkFolderOrder: string[];
  maxZIndex: number;
}

export type WorkspaceSnapshotV5 = WorkspaceSnapshotV7;
export type WorkspaceSnapshot = WorkspaceSnapshotV7;

export interface WorkspaceExportBoxV3 {
  id: string;
  customTitle: string | null;
  itemIds: string[];
}

export interface WorkspaceExportDocumentV3 {
  version: 3;
  boxes: WorkspaceExportBoxV3[];
  items: WorkspaceItem[];
  itemPlacementsByBoxId: Record<string, BoxItemPlacement[]>;
  boxViewStates: BoxDesktopViewState[];
}

export interface WorkspaceExportBoxV4 extends WorkspaceBoxEntity {
  itemIds: string[];
}

export interface WorkspaceExportDocumentV4 {
  version: 4;
  boxes: WorkspaceExportBoxV4[];
  items: WorkspaceItem[];
  itemPlacementsByBoxId: Record<string, BoxItemPlacement[]>;
  boxViewStates: BoxDesktopViewState[];
}

export interface WorkspaceExportDocumentV5 {
  version: 5;
  boxes: WorkspaceExportBoxV4[];
  items: WorkspaceItem[];
  itemPlacementsByBoxId: Record<string, BoxItemPlacement[]>;
  boxViewStates: BoxDesktopViewState[];
  bookmarks: Bookmark[];
  bookmarkFolders: BookmarkFolder[];
}

export interface WorkspaceBoxUpdate {
  customTitle?: string | null;
  templateId?: BoxTemplateId;
  templateState?: WorkspaceBoxTemplateState;
  bounds?: Partial<WorkspaceBoxBounds>;
  isLocked?: boolean;
  isCollapsed?: boolean;
  isMinimized?: boolean;
  layout?: BoxLayout;
  zIndex?: number;
}

export type WorkspaceCommand =
  | { type: 'workspace.replace'; snapshot: WorkspaceSnapshotV7 }
  | { type: 'workspace.replaceBoxes'; boxes: WorkspaceBoxWithItems[] }
  | {
      type: 'box.create';
      box: WorkspaceBox;
      items?: WorkspaceItem[];
      placements?: BoxItemPlacement[];
    }
  | { type: 'box.update'; boxId: string; updates: WorkspaceBoxUpdate }
  | { type: 'box.delete'; boxId: string }
  | { type: 'box.bringToFront'; boxId: string }
  | { type: 'kanban.column.add'; boxId: string; column: KanbanColumn; afterColumnId?: string }
  | { type: 'kanban.column.update'; boxId: string; columnId: string; title: string }
  | {
      type: 'kanban.column.delete';
      boxId: string;
      columnId: string;
      fallbackColumnId?: string;
    }
  | { type: 'kanban.column.move'; boxId: string; columnId: string; targetIndex: number }
  | {
      type: 'item.add';
      boxId: string;
      item: WorkspaceItem;
      isPinned?: boolean;
      columnId?: string;
    }
  | { type: 'item.update'; boxId?: string; itemId: string; updates: WorkspaceItemUpdate }
  | { type: 'item.delete'; boxId?: string; itemId: string }
  | { type: 'item.setPinned'; boxId: string; itemId: string; isPinned: boolean }
  | {
      type: 'item.move';
      itemId: string;
      sourceBoxId: string;
      targetBoxId: string;
      targetIndex?: number;
      targetColumnId?: string;
    }
  | { type: 'bookmark.upsert'; bookmark: Bookmark }
  | { type: 'bookmark.delete'; bookmarkId: string }
  | { type: 'bookmark.folder.upsert'; folder: BookmarkFolder; index?: number }
  | { type: 'bookmark.folder.delete'; folderId: string }
  | { type: 'bookmark.recordOpen'; bookmarkId: string; openedAt: string }
  | {
      type: 'bookmarks.import';
      bookmarks: Bookmark[];
      folders: BookmarkFolder[];
      folderOrder?: string[];
    };

export const WORKSPACE_SCHEMA_VERSION = 7 as const;
export const WORKSPACE_EXPORT_VERSION = 5 as const;
export const MAX_WORKSPACE_BOXES = 12;
export const MAX_KANBAN_COLUMNS = 8;
export const DEFAULT_BOX_TEMPLATE_ID: BoxTemplateId = 'collection';
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'Doing' },
  { id: 'done', title: 'Done' },
];
export const DEFAULT_PROJECT_BOARD_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'doing', title: 'Doing' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];
export const DEFAULT_DAILY_DESK_COLUMNS: KanbanColumn[] = [
  { id: 'capture', title: 'Capture' },
  { id: 'today', title: 'Today' },
  { id: 'waiting', title: 'Waiting' },
  { id: 'done', title: 'Done' },
];

/** Minimum visual dimensions for workspace boxes, shared across codec and resize logic. */
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
