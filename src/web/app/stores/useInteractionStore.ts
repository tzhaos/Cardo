import { create } from 'zustand';
import type { SnapPreview } from '../../../core/domains/layout/model/snap';

let focusedItemSequence = 0;

export interface DraggedItemInfo {
  itemId: string;
  sourceBoxId: string;
}

export interface FocusedItemInfo {
  itemId: string;
  boxId: string;
  focusedAt: number;
}

interface InteractionStoreState {
  activeBoxId: string | null;
  draggedItemInfo: DraggedItemInfo | null;
  editingSessionId: string | null;
  focusedItemInfo: FocusedItemInfo | null;
  snapPreview: SnapPreview | null;
  setActiveBox: (boxId: string | null) => void;
  setDraggedItemInfo: (info: DraggedItemInfo | null) => void;
  setEditingSessionId: (sessionId: string | null) => void;
  setFocusedItemInfo: (info: Omit<FocusedItemInfo, 'focusedAt'> | null) => void;
  setSnapPreview: (preview: SnapPreview | null) => void;
}

export const useInteractionStore = create<InteractionStoreState>((set) => ({
  activeBoxId: null,
  draggedItemInfo: null,
  editingSessionId: null,
  focusedItemInfo: null,
  snapPreview: null,
  setActiveBox: (boxId) => set({ activeBoxId: boxId }),
  setDraggedItemInfo: (info) => set({ draggedItemInfo: info }),
  setEditingSessionId: (sessionId) => set({ editingSessionId: sessionId }),
  setFocusedItemInfo: (info) =>
    set({
      focusedItemInfo: info ? { ...info, focusedAt: (focusedItemSequence += 1) } : null,
    }),
  setSnapPreview: (preview) => set({ snapPreview: preview }),
}));
