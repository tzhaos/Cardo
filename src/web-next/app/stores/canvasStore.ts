import { create } from 'zustand';
import {
  constrainCanvasCamera,
  ORIGIN_CANVAS_CAMERA,
  panCanvasCamera,
  type CanvasCamera,
  type CanvasPoint,
  type CanvasViewportSize,
} from '../../domain/canvasGeometry';

export type CanvasInteractionMode = 'idle' | 'panning';

export interface PageCanvasState {
  camera: CanvasCamera;
  isLocked: boolean;
}

interface CanvasStore {
  pages: Record<string, PageCanvasState>;
  viewportSize: CanvasViewportSize;
  interactionMode: CanvasInteractionMode;
  isPanModifierActive: boolean;
  setViewportSize: (viewportSize: CanvasViewportSize) => void;
  panBy: (pageId: string, delta: CanvasPoint) => void;
  resetCamera: (pageId: string) => void;
  toggleLocked: (pageId: string) => void;
  setInteractionMode: (interactionMode: CanvasInteractionMode) => void;
  setPanModifierActive: (isPanModifierActive: boolean) => void;
}

const DEFAULT_PAGE_CANVAS_STATE: PageCanvasState = {
  camera: ORIGIN_CANVAS_CAMERA,
  isLocked: false,
};

export const useCanvasStore = create<CanvasStore>((set) => ({
  pages: {},
  viewportSize: { width: 0, height: 0 },
  interactionMode: 'idle',
  isPanModifierActive: false,
  setViewportSize: (viewportSize) =>
    set((state) => {
      if (
        state.viewportSize.width === viewportSize.width &&
        state.viewportSize.height === viewportSize.height
      ) {
        return state;
      }
      return {
        viewportSize,
        pages: Object.fromEntries(
          Object.entries(state.pages).map(([pageId, page]) => [
            pageId,
            { ...page, camera: constrainCanvasCamera(page.camera, viewportSize) },
          ]),
        ),
      };
    }),
  panBy: (pageId, delta) =>
    set((state) => {
      const page = getPageCanvasState(state, pageId);
      const camera = panCanvasCamera(page.camera, delta, state.viewportSize);
      if (camera.panX === page.camera.panX && camera.panY === page.camera.panY) {
        return state;
      }
      return {
        pages: {
          ...state.pages,
          [pageId]: { ...page, camera },
        },
      };
    }),
  resetCamera: (pageId) =>
    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: { ...getPageCanvasState(state, pageId), camera: ORIGIN_CANVAS_CAMERA },
      },
    })),
  toggleLocked: (pageId) =>
    set((state) => {
      const page = getPageCanvasState(state, pageId);
      return {
        pages: {
          ...state.pages,
          [pageId]: { ...page, isLocked: !page.isLocked },
        },
      };
    }),
  setInteractionMode: (interactionMode) => set({ interactionMode }),
  setPanModifierActive: (isPanModifierActive) => set({ isPanModifierActive }),
}));

export function getPageCanvasState(
  state: Pick<CanvasStore, 'pages'>,
  pageId: string,
): PageCanvasState {
  return state.pages[pageId] ?? DEFAULT_PAGE_CANVAS_STATE;
}
