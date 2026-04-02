import { create } from 'zustand';
import type { SnapPreview } from '../../domains/layout/model/snap';

export interface DraggedItemInfo {
  itemId: string;
  sourceBoxId: string;
}

interface InteractionStoreState {
  activeBoxId: string | null;
  draggedItemInfo: DraggedItemInfo | null;
  editingSessionId: string | null;
  snapPreview: SnapPreview | null;
  setActiveBox: (boxId: string | null) => void;
  setDraggedItemInfo: (info: DraggedItemInfo | null) => void;
  setEditingSessionId: (sessionId: string | null) => void;
  setSnapPreview: (preview: SnapPreview | null) => void;
}

export const useInteractionStore = create<InteractionStoreState>((set) => ({
  activeBoxId: null,
  draggedItemInfo: null,
  editingSessionId: null,
  snapPreview: null,
  setActiveBox: (boxId) => set({ activeBoxId: boxId }),
  setDraggedItemInfo: (info) => set({ draggedItemInfo: info }),
  setEditingSessionId: (sessionId) => set({ editingSessionId: sessionId }),
  setSnapPreview: (preview) => set({ snapPreview: preview }),
}));
