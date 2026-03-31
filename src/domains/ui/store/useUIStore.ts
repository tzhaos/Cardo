import { create } from 'zustand';
import type { SnapPreview } from '../../layout/model/snap';

export interface DraggedItemInfo {
  itemId: string;
  sourceBoxId: string;
}

interface UIState {
  activeBoxId: string | null;
  draggedItemInfo: DraggedItemInfo | null;
  editingSessionId: string | null;
  snapPreview: SnapPreview | null;
  setActiveBox: (id: string | null) => void;
  setDraggedItemInfo: (info: DraggedItemInfo | null) => void;
  setEditingSessionId: (id: string | null) => void;
  setSnapPreview: (preview: SnapPreview | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeBoxId: null,
  draggedItemInfo: null,
  editingSessionId: null,
  snapPreview: null,
  setActiveBox: (id) => set({ activeBoxId: id }),
  setDraggedItemInfo: (info) => set({ draggedItemInfo: info }),
  setEditingSessionId: (id) => set({ editingSessionId: id }),
  setSnapPreview: (preview) => set({ snapPreview: preview }),
}));
