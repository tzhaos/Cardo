import { create } from 'zustand';
import type { BoxFrame, WorkspaceItemType } from '../../domain/workspace';

export type RuntimeConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

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
  /** True while box drag pointer is over primary nav / sidebar. Name kept until cutover. */
  boxDragOverTopBar: boolean;
  /** Page id under pointer within primary nav drop rows, or null. */
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
  /** Ephemeral Runtime event-stream status (not persisted). */
  runtimeConnectionStatus: RuntimeConnectionStatus;
  setSearchQuery: (query: string) => void;
  setRuntimeConnectionStatus: (status: RuntimeConnectionStatus) => void;
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
  runtimeConnectionStatus: 'connected',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setRuntimeConnectionStatus: (status) =>
    set((state) =>
      state.runtimeConnectionStatus === status ? state : { runtimeConnectionStatus: status },
    ),
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
  /**
   * Pointer-rate frame while dragging. Mutate latestFrame in place and return the
   * same state root so Zustand does not notify React subscribers. Visual position
   * is owned by motion values; React only needs begin/rebase/end session identity.
   */
  updateBoxDragFrame: (frame) =>
    set((state) => {
      if (!state.boxDragSession) return state;
      const prev = state.boxDragSession.latestFrame;
      if (
        prev.x === frame.x &&
        prev.y === frame.y &&
        prev.width === frame.width &&
        prev.height === frame.height
      ) {
        return state;
      }
      state.boxDragSession.latestFrame = frame;
      return state;
    }),
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
