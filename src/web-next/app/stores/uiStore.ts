import { create } from 'zustand';

export interface AddDraftState {
  mode: boolean;
  draft: Record<string, string>;
  confirmDiscard: boolean;
  highlightItemId?: string;
}

interface UiStore {
  addDrafts: Record<string, AddDraftState>;
  draggedBoxId: string | null;
  boxDropPageId: string | null;
  selectedBoxId: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectBox: (boxId: string | null) => void;
  openAddView: (boxId: string) => void;
  updateDraft: (boxId: string, patch: Record<string, string>) => void;
  requestCloseAddView: (boxId: string) => void;
  confirmDiscard: (boxId: string) => void;
  cancelDiscard: (boxId: string) => void;
  closeAddView: (boxId: string) => void;
  markCreated: (boxId: string, itemId: string) => void;
  beginBoxDrag: (boxId: string) => void;
  setBoxDropPage: (pageId: string | null) => void;
  endBoxDrag: () => void;
}

const emptyDraft: AddDraftState = { mode: false, draft: {}, confirmDiscard: false };

export const useUiStore = create<UiStore>((set) => ({
  addDrafts: {},
  draggedBoxId: null,
  boxDropPageId: null,
  selectedBoxId: null,
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectBox: (boxId) => set({ selectedBoxId: boxId }),
  openAddView: (boxId) =>
    set((state) => ({
      selectedBoxId: boxId,
      addDrafts: {
        ...state.addDrafts,
        [boxId]: { ...(state.addDrafts[boxId] ?? emptyDraft), mode: true, confirmDiscard: false },
      },
    })),
  updateDraft: (boxId, patch) =>
    set((state) => {
      const current = state.addDrafts[boxId] ?? emptyDraft;
      return {
        addDrafts: {
          ...state.addDrafts,
          [boxId]: { ...current, draft: { ...current.draft, ...patch }, confirmDiscard: false },
        },
      };
    }),
  requestCloseAddView: (boxId) =>
    set((state) => {
      const current = state.addDrafts[boxId] ?? emptyDraft;
      const hasDraft = Object.values(current.draft).some((value) => value.trim().length > 0);
      return {
        addDrafts: {
          ...state.addDrafts,
          [boxId]: hasDraft
            ? { ...current, confirmDiscard: true }
            : { ...emptyDraft, highlightItemId: current.highlightItemId },
        },
      };
    }),
  confirmDiscard: (boxId) =>
    set((state) => ({
      addDrafts: { ...state.addDrafts, [boxId]: { ...emptyDraft } },
    })),
  cancelDiscard: (boxId) =>
    set((state) => {
      const current = state.addDrafts[boxId] ?? emptyDraft;
      return { addDrafts: { ...state.addDrafts, [boxId]: { ...current, confirmDiscard: false } } };
    }),
  closeAddView: (boxId) =>
    set((state) => ({ addDrafts: { ...state.addDrafts, [boxId]: { ...emptyDraft } } })),
  markCreated: (boxId, itemId) =>
    set((state) => ({
      addDrafts: { ...state.addDrafts, [boxId]: { ...emptyDraft, highlightItemId: itemId } },
    })),
  beginBoxDrag: (boxId) => set({ draggedBoxId: boxId, boxDropPageId: null, selectedBoxId: boxId }),
  setBoxDropPage: (pageId) =>
    set((state) => (state.draggedBoxId ? { boxDropPageId: pageId } : state)),
  endBoxDrag: () => set({ draggedBoxId: null, boxDropPageId: null }),
}));
