import { create } from 'zustand';
import { createDefaultWorkspace, createItem } from '../../domain/factories';
import type {
  BoxFrame,
  BoxItem,
  WorkspaceBoxType,
  WorkspaceSnapshot,
} from '../../domain/workspace';
import {
  addBox,
  addItem,
  addPage,
  deleteBox,
  deleteItem,
  deletePage,
  moveBoxToPage,
  renameBox,
  renameItem,
  renamePage,
  reorderPages,
  setActivePage,
  updateBoxFrame,
} from '../../domain/reducers';

interface WorkspaceStore {
  snapshot: WorkspaceSnapshot;
  createPage: (title?: string) => string;
  renamePage: (pageId: string, title: string) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (orderedPageIds: string[]) => void;
  setActivePage: (pageId: string) => void;
  createBox: (type: WorkspaceBoxType, frame: BoxFrame, title?: string) => void;
  updateBoxFrame: (boxId: string, frame: BoxFrame) => void;
  renameBox: (boxId: string, title: string) => void;
  moveBoxToPage: (boxId: string, pageId: string, frame?: BoxFrame) => void;
  deleteBox: (boxId: string) => void;
  createItem: (boxId: string, type: WorkspaceBoxType, draft: Record<string, string>) => BoxItem;
  renameItem: (boxId: string, itemId: string, title: string) => void;
  deleteItem: (boxId: string, itemId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  snapshot: createDefaultWorkspace(),
  createPage: (title = 'Untitled') => {
    let createdPageId = '';
    set((state) => {
      const nextSnapshot = addPage(state.snapshot, title);
      createdPageId = nextSnapshot.activePageId;
      return { snapshot: nextSnapshot };
    });
    return createdPageId;
  },
  renamePage: (pageId, title) =>
    set((state) => ({ snapshot: renamePage(state.snapshot, pageId, title) })),
  deletePage: (pageId) => set((state) => ({ snapshot: deletePage(state.snapshot, pageId) })),
  reorderPages: (orderedPageIds) =>
    set((state) => ({ snapshot: reorderPages(state.snapshot, orderedPageIds) })),
  setActivePage: (pageId) => set((state) => ({ snapshot: setActivePage(state.snapshot, pageId) })),
  createBox: (type, frame, title) =>
    set((state) => ({
      snapshot: addBox(state.snapshot, state.snapshot.activePageId, type, frame, title),
    })),
  updateBoxFrame: (boxId, frame) =>
    set((state) => ({ snapshot: updateBoxFrame(state.snapshot, boxId, frame) })),
  renameBox: (boxId, title) =>
    set((state) => ({ snapshot: renameBox(state.snapshot, boxId, title) })),
  moveBoxToPage: (boxId, pageId, frame) =>
    set((state) => ({ snapshot: moveBoxToPage(state.snapshot, boxId, pageId, frame) })),
  deleteBox: (boxId) => set((state) => ({ snapshot: deleteBox(state.snapshot, boxId) })),
  createItem: (boxId, type, draft) => {
    const item = createItem(type, draft as never);
    set((state) => ({ snapshot: addItem(state.snapshot, boxId, item) }));
    return item;
  },
  renameItem: (boxId, itemId, title) =>
    set((state) => ({ snapshot: renameItem(state.snapshot, boxId, itemId, title) })),
  deleteItem: (boxId, itemId) =>
    set((state) => ({ snapshot: deleteItem(state.snapshot, boxId, itemId) })),
}));

export function getViewportCenterFrame(
  type: WorkspaceBoxType,
  point?: { x: number; y: number },
): BoxFrame {
  const width = 320;
  const height = 240;
  const fallbackX = typeof window === 'undefined' ? 160 : window.innerWidth / 2 - width / 2;
  const fallbackY = typeof window === 'undefined' ? 150 : window.innerHeight / 2 - height / 2;

  return {
    x: Math.max(24, Math.round(point?.x ?? fallbackX)),
    y: Math.max(24, Math.round(point?.y ?? fallbackY)),
    width,
    height,
  };
}
