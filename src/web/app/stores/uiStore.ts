import { create } from 'zustand';
import type { BoxFrame, WorkspaceItemType } from '../../domain/workspace';

export type RuntimeConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface AddDraftState {
  mode: boolean;
  itemType?: WorkspaceItemType;
  draft: Record<string, string>;
  highlightItemId?: string;
}

/** Visual morphology of the floating drag ghost. */
export type BoxDragMorphology = 'freeform' | 'card' | 'list';

export interface BoxDragSession {
  boxId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  /** Last pointer client position — used to seed fixed paint after remount (no flash). */
  lastClientX: number;
  lastClientY: number;
  startFrame: BoxFrame;
  latestFrame: BoxFrame;
  transformOrigin: string;
  /** freeform box / waterfall card / list section — drives DraggedBoxLayer chrome. */
  morphology: BoxDragMorphology;
}

/** Live insert slot while dragging in waterfall/list. */
export interface ManagedInsertPreview {
  pageId: string;
  mode: 'waterfall' | 'list';
  insertIndex: number;
  slotFrame: BoxFrame;
  /** Neighbor reflow frames (boxId → frame) so cards part open a hole. */
  frames: Record<string, BoxFrame>;
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
  /** Waterfall/list insert ghost while dragging. */
  managedInsertPreview: ManagedInsertPreview | null;
  selectedBoxId: string | null;
  highlightedBoxId: string | null;
  searchQuery: string;
  /** Full search page open from sidebar entry (with new group). */
  searchOpen: boolean;
  /** Ephemeral Runtime event-stream status (not persisted). */
  runtimeConnectionStatus: RuntimeConnectionStatus;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
  setRuntimeConnectionStatus: (status: RuntimeConnectionStatus) => void;
  selectBox: (boxId: string | null) => void;
  highlightBox: (boxId: string) => void;
  openAddView: (boxId: string, itemType?: WorkspaceItemType) => void;
  selectAddItemType: (boxId: string, itemType: WorkspaceItemType) => void;
  updateDraft: (boxId: string, patch: Record<string, string>) => void;
  closeAddView: (boxId: string) => void;
  markCreated: (boxId: string, itemId: string) => void;
  beginBoxDrag: (session: BoxDragSession) => void;
  /** Pointer-rate world frame + last client; mutates session without React notify. */
  updateBoxDragFrame: (frame: BoxFrame, clientX?: number, clientY?: number) => void;
  rebaseBoxDragSession: (frame: BoxFrame, clientX: number, clientY: number) => void;
  setBoxDragOverTopBar: (overTopBar: boolean) => void;
  setBoxDropPage: (pageId: string | null) => void;
  setManagedInsertPreview: (preview: ManagedInsertPreview | null) => void;
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
/** Per-box item highlight clear timers (created-item flash). */
const itemHighlightTimeouts = new Map<string, number>();

export function clearItemHighlight(boxId: string) {
  const timeout = itemHighlightTimeouts.get(boxId);
  if (timeout !== undefined) {
    window.clearTimeout(timeout);
    itemHighlightTimeouts.delete(boxId);
  }
  useUiStore.setState((state) => {
    const draft = state.addDrafts[boxId];
    if (!draft?.highlightItemId) return state;
    return {
      addDrafts: {
        ...state.addDrafts,
        [boxId]: { ...draft, highlightItemId: undefined },
      },
    };
  });
}

export const useUiStore = create<UiStore>((set) => ({
  addDrafts: {},
  draggedBoxId: null,
  boxDragSession: null,
  boxDragOverTopBar: false,
  boxDropPageId: null,
  boxDropRelease: null,
  pendingBoxLanding: null,
  managedInsertPreview: null,
  selectedBoxId: null,
  highlightedBoxId: null,
  searchQuery: '',
  searchOpen: false,
  runtimeConnectionStatus: 'connected',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchOpen: (open) =>
    set((state) => (state.searchOpen === open ? state : { searchOpen: open })),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false, searchQuery: '' }),
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
  markCreated: (boxId, itemId) => {
    const existing = itemHighlightTimeouts.get(boxId);
    if (existing !== undefined) window.clearTimeout(existing);
    set((state) => ({
      addDrafts: { ...state.addDrafts, [boxId]: { ...emptyDraft, highlightItemId: itemId } },
    }));
    itemHighlightTimeouts.set(
      boxId,
      window.setTimeout(() => {
        itemHighlightTimeouts.delete(boxId);
        set((state) => {
          const draft = state.addDrafts[boxId];
          if (!draft?.highlightItemId || draft.highlightItemId !== itemId) return state;
          return {
            addDrafts: {
              ...state.addDrafts,
              [boxId]: { ...draft, highlightItemId: undefined },
            },
          };
        });
      }, 1800),
    );
  },
  beginBoxDrag: (session) =>
    set({
      draggedBoxId: session.boxId,
      boxDragSession: {
        ...session,
        lastClientX: session.lastClientX ?? session.startClientX,
        lastClientY: session.lastClientY ?? session.startClientY,
        morphology: session.morphology ?? 'freeform',
      },
      boxDragOverTopBar: false,
      boxDropPageId: null,
      boxDropRelease: null,
      pendingBoxLanding: null,
      managedInsertPreview: null,
      selectedBoxId: session.boxId,
    }),
  /**
   * Pointer-rate frame while dragging. Mutate latestFrame (and last client) in place
   * and return the same state root so Zustand does not notify React subscribers.
   * Visual position is owned by motion values; React only needs begin/rebase/end.
   */
  updateBoxDragFrame: (frame, clientX, clientY) =>
    set((state) => {
      if (!state.boxDragSession) return state;
      const prev = state.boxDragSession.latestFrame;
      const sameFrame =
        prev.x === frame.x &&
        prev.y === frame.y &&
        prev.width === frame.width &&
        prev.height === frame.height;
      const sameClient =
        clientX === undefined ||
        clientY === undefined ||
        (state.boxDragSession.lastClientX === clientX &&
          state.boxDragSession.lastClientY === clientY);
      if (sameFrame && sameClient) {
        return state;
      }
      state.boxDragSession.latestFrame = frame;
      if (clientX !== undefined) state.boxDragSession.lastClientX = clientX;
      if (clientY !== undefined) state.boxDragSession.lastClientY = clientY;
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
              lastClientX: clientX,
              lastClientY: clientY,
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
  setManagedInsertPreview: (preview) =>
    set((state) => {
      if (!preview) {
        return state.managedInsertPreview ? { managedInsertPreview: null } : state;
      }
      const prev = state.managedInsertPreview;
      if (
        prev &&
        prev.pageId === preview.pageId &&
        prev.mode === preview.mode &&
        prev.insertIndex === preview.insertIndex &&
        prev.slotFrame.x === preview.slotFrame.x &&
        prev.slotFrame.y === preview.slotFrame.y &&
        prev.slotFrame.width === preview.slotFrame.width &&
        prev.slotFrame.height === preview.slotFrame.height
      ) {
        return state;
      }
      return { managedInsertPreview: preview };
    }),
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
      managedInsertPreview: null,
    }),
}));
