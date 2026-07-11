import { create } from 'zustand';
import type { BoxFrame, WorkspaceItemType } from '../../domain/workspace';

export interface AddDraftState {
  mode: boolean;
  itemType?: WorkspaceItemType;
  draft: Record<string, string>;
  highlightItemId?: string;
}

export interface BoxDragSession {
  boxId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startFrame: BoxFrame;
  latestFrame: BoxFrame;
  transformOrigin: string;
}

interface UiStore {
  addDrafts: Record<string, AddDraftState>;
  draggedBoxId: string | null;
  boxDragSession: BoxDragSession | null;
  boxDragOverTopBar: boolean;
  boxDropPageId: string | null;
  boxDropRelease: {
    boxId: string;
    pageId: string;
    entryFrame: BoxFrame;
    entryScale: number;
    entryTransformOrigin: string;
  } | null;
  pendingBoxLanding: { boxId: string; frame: BoxFrame } | null;
  selectedBoxId: string | null;
  highlightedBoxId: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectBox: (boxId: string | null) => void;
  highlightBox: (boxId: string) => void;
  openAddView: (boxId: string, itemType?: WorkspaceItemType) => void;
  selectAddItemType: (boxId: string, itemType: WorkspaceItemType) => void;
  updateDraft: (boxId: string, patch: Record<string, string>) => void;
  closeAddView: (boxId: string) => void;
  markCreated: (boxId: string, itemId: string) => void;
  beginBoxDrag: (session: BoxDragSession) => void;
  updateBoxDragFrame: (frame: BoxFrame) => void;
  rebaseBoxDragSession: (frame: BoxFrame, clientX: number, clientY: number) => void;
  setBoxDragOverTopBar: (overTopBar: boolean) => void;
  setBoxDropPage: (pageId: string | null) => void;
  finishBoxDrop: (
    boxId: string,
    pageId: string,
    entryFrame: BoxFrame,
    entryScale: number,
    entryTransformOrigin: string,
  ) => void;
  clearBoxDropRelease: () => void;
  setPendingBoxLanding: (boxId: string, frame: BoxFrame) => void;
  clearPendingBoxLanding: (boxId?: string) => void;
  endBoxDrag: () => void;
}

const emptyDraft: AddDraftState = { mode: false, draft: {} };
let boxHighlightTimeout: number | null = null;

export const useUiStore = create<UiStore>((set) => ({
  addDrafts: {},
  draggedBoxId: null,
  boxDragSession: null,
  boxDragOverTopBar: false,
  boxDropPageId: null,
  boxDropRelease: null,
  pendingBoxLanding: null,
  selectedBoxId: null,
  highlightedBoxId: null,
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectBox: (boxId) => set({ selectedBoxId: boxId }),
  highlightBox: (boxId) => {
    if (boxHighlightTimeout !== null) window.clearTimeout(boxHighlightTimeout);
    set({ highlightedBoxId: boxId });
    boxHighlightTimeout = window.setTimeout(() => {
      boxHighlightTimeout = null;
      set((state) => (state.highlightedBoxId === boxId ? { highlightedBoxId: null } : state));
    }, 1800);
  },
  openAddView: (boxId, itemType) =>
    set((state) => ({
      selectedBoxId: boxId,
      addDrafts: {
        ...state.addDrafts,
        [boxId]: { ...(state.addDrafts[boxId] ?? emptyDraft), mode: true, itemType },
      },
    })),
  selectAddItemType: (boxId, itemType) =>
    set((state) => ({
      addDrafts: {
        ...state.addDrafts,
        [boxId]: { mode: true, itemType, draft: {} },
      },
    })),
  updateDraft: (boxId, patch) =>
    set((state) => {
      const current = state.addDrafts[boxId] ?? emptyDraft;
      return {
        addDrafts: {
          ...state.addDrafts,
          [boxId]: { ...current, draft: { ...current.draft, ...patch } },
        },
      };
    }),
  closeAddView: (boxId) =>
    set((state) => ({ addDrafts: { ...state.addDrafts, [boxId]: { ...emptyDraft } } })),
  markCreated: (boxId, itemId) =>
    set((state) => ({
      addDrafts: { ...state.addDrafts, [boxId]: { ...emptyDraft, highlightItemId: itemId } },
    })),
  beginBoxDrag: (session) =>
    set({
      draggedBoxId: session.boxId,
      boxDragSession: session,
      boxDragOverTopBar: false,
      boxDropPageId: null,
      boxDropRelease: null,
      pendingBoxLanding: null,
      selectedBoxId: session.boxId,
    }),
  updateBoxDragFrame: (frame) =>
    set((state) =>
      state.boxDragSession
        ? { boxDragSession: { ...state.boxDragSession, latestFrame: frame } }
        : state,
    ),
  rebaseBoxDragSession: (frame, clientX, clientY) =>
    set((state) =>
      state.boxDragSession
        ? {
            boxDragSession: {
              ...state.boxDragSession,
              startClientX: clientX,
              startClientY: clientY,
              startFrame: frame,
              latestFrame: frame,
            },
          }
        : state,
    ),
  setBoxDragOverTopBar: (overTopBar) =>
    set((state) =>
      state.draggedBoxId && state.boxDragOverTopBar !== overTopBar
        ? { boxDragOverTopBar: overTopBar }
        : state,
    ),
  setBoxDropPage: (pageId) =>
    set((state) =>
      state.draggedBoxId && state.boxDropPageId !== pageId ? { boxDropPageId: pageId } : state,
    ),
  finishBoxDrop: (boxId, pageId, entryFrame, entryScale, entryTransformOrigin) =>
    set({ boxDropRelease: { boxId, pageId, entryFrame, entryScale, entryTransformOrigin } }),
  clearBoxDropRelease: () => set({ boxDropRelease: null }),
  setPendingBoxLanding: (boxId, frame) => set({ pendingBoxLanding: { boxId, frame } }),
  clearPendingBoxLanding: (boxId) =>
    set((state) =>
      !state.pendingBoxLanding || (boxId && state.pendingBoxLanding.boxId !== boxId)
        ? state
        : { pendingBoxLanding: null },
    ),
  endBoxDrag: () =>
    set({
      draggedBoxId: null,
      boxDragSession: null,
      boxDragOverTopBar: false,
      boxDropPageId: null,
    }),
}));
