import { create } from 'zustand';
import type { SnapPreview } from '../../../core/domains/layout/model/snap';

export interface DraggedItemInfo {
  itemId: string;
  sourceBoxId: string;
}

export interface BoxTransitionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoxTransitionState {
  boxId: string;
  kind: 'minimize' | 'restore';
  dockRect: BoxTransitionRect | null;
}

interface InteractionStoreState {
  activeBoxId: string | null;
  boxTransition: BoxTransitionState | null;
  draggedItemInfo: DraggedItemInfo | null;
  editingSessionId: string | null;
  snapPreview: SnapPreview | null;
  setActiveBox: (boxId: string | null) => void;
  setBoxTransition: (transition: BoxTransitionState | null) => void;
  setDraggedItemInfo: (info: DraggedItemInfo | null) => void;
  setEditingSessionId: (sessionId: string | null) => void;
  setSnapPreview: (preview: SnapPreview | null) => void;
}

export const useInteractionStore = create<InteractionStoreState>((set) => ({
  activeBoxId: null,
  boxTransition: null,
  draggedItemInfo: null,
  editingSessionId: null,
  snapPreview: null,
  setActiveBox: (boxId) => set({ activeBoxId: boxId }),
  setBoxTransition: (transition) => set({ boxTransition: transition }),
  setDraggedItemInfo: (info) => set({ draggedItemInfo: info }),
  setEditingSessionId: (sessionId) => set({ editingSessionId: sessionId }),
  setSnapPreview: (preview) => set({ snapPreview: preview }),
}));
