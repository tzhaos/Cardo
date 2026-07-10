import { create } from 'zustand';

export interface AddDraftState {
  mode: boolean;
  draft: Record<string, string>;
  highlightItemId?: string;
}

interface UiStore {
  addDrafts: Record<string, AddDraftState>;
  draggedBoxId: string | null;
  boxDragOverTopBar: boolean;
  boxDropPageId: string | null;
  boxDropRelease: { boxId: string; pageId: string } | null;
  selectedBoxId: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectBox: (boxId: string | null) => void;
  openAddView: (boxId: string) => void;
  updateDraft: (boxId: string, patch: Record<string, string>) => void;
  closeAddView: (boxId: string) => void;
  markCreated: (boxId: string, itemId: string) => void;
  beginBoxDrag: (boxId: string) => void;
  setBoxDragOverTopBar: (overTopBar: boolean) => void;
  setBoxDropPage: (pageId: string | null) => void;
  finishBoxDrop: (boxId: string, pageId: string) => void;
  clearBoxDropRelease: () => void;
  endBoxDrag: () => void;
}

const emptyDraft: AddDraftState = { mode: false, draft: {} };

export const useUiStore = create<UiStore>((set) => ({
  addDrafts: {},
  draggedBoxId: null,
  boxDragOverTopBar: false,
  boxDropPageId: null,
  boxDropRelease: null,
  selectedBoxId: null,
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectBox: (boxId) => set({ selectedBoxId: boxId }),
  openAddView: (boxId) =>
    set((state) => ({
      selectedBoxId: boxId,
      addDrafts: {
        ...state.addDrafts,
        [boxId]: { ...(state.addDrafts[boxId] ?? emptyDraft), mode: true },
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
  beginBoxDrag: (boxId) =>
    set({
      draggedBoxId: boxId,
      boxDragOverTopBar: false,
      boxDropPageId: null,
      boxDropRelease: null,
      selectedBoxId: boxId,
    }),
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
  finishBoxDrop: (boxId, pageId) => set({ boxDropRelease: { boxId, pageId } }),
  clearBoxDropRelease: () => set({ boxDropRelease: null }),
  endBoxDrag: () =>
    set({ draggedBoxId: null, boxDragOverTopBar: false, boxDropPageId: null }),
}));
