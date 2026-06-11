import { create } from 'zustand';

export type CanvasInteractionMode = 'idle' | 'panning' | 'box-dragging' | 'box-resizing';

interface CanvasStoreState {
  panX: number;
  panY: number;
  isLocked: boolean;
  interactionMode: CanvasInteractionMode;
  isPanModifierActive: boolean;
  panBy: (deltaX: number, deltaY: number) => void;
  resetPan: () => void;
  centerOn: (worldX: number, worldY: number, viewport: { width: number; height: number }) => void;
  setLocked: (isLocked: boolean) => void;
  setInteractionMode: (mode: CanvasInteractionMode) => void;
  setPanModifierActive: (isActive: boolean) => void;
}

export const useCanvasStore = create<CanvasStoreState>((set) => ({
  panX: 0,
  panY: 0,
  isLocked: false,
  interactionMode: 'idle',
  isPanModifierActive: false,
  panBy: (deltaX, deltaY) =>
    set((state) => ({
      panX: state.panX + deltaX,
      panY: state.panY + deltaY,
    })),
  resetPan: () => set({ panX: 0, panY: 0 }),
  centerOn: (worldX, worldY, viewport) =>
    set({
      panX: viewport.width / 2 - worldX,
      panY: viewport.height / 2 - worldY,
    }),
  setLocked: (isLocked) => set({ isLocked }),
  setInteractionMode: (interactionMode) => set({ interactionMode }),
  setPanModifierActive: (isPanModifierActive) => set({ isPanModifierActive }),
}));
