import { create } from 'zustand';
import type { SnapPreview } from '../../layout/model/snap';

export interface DraggedItemInfo {
  itemId: string;
  sourceBoxId: string;
}

interface UIState {
  activeBoxId: string | null;
  isSettingsOpen: boolean;
  draggedItemInfo: DraggedItemInfo | null;
  editingSessionId: string | null;
  snapPreview: SnapPreview | null;
  setActiveBox: (id: string | null) => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  setDraggedItemInfo: (info: DraggedItemInfo | null) => void;
  setEditingSessionId: (id: string | null) => void;
  setSnapPreview: (preview: SnapPreview | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeBoxId: null,
  isSettingsOpen: false,
  draggedItemInfo: null,
  editingSessionId: null,
  snapPreview: null,
  setActiveBox: (id) => set({ activeBoxId: id }),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  setDraggedItemInfo: (info) => set({ draggedItemInfo: info }),
  setEditingSessionId: (id) => set({ editingSessionId: id }),
  setSnapPreview: (preview) => set({ snapPreview: preview }),
}));
