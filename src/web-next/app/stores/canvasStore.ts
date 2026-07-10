import { create } from 'zustand';
import {
  constrainCanvasCamera,
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
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
  isCameraAnimating?: boolean;
}

interface CanvasStore {
  pages: Record<string, PageCanvasState>;
  viewportSize: CanvasViewportSize;
  interactionMode: CanvasInteractionMode;
  isPanModifierActive: boolean;
  setViewportSize: (viewportSize: CanvasViewportSize) => void;
  panBy: (pageId: string, delta: CanvasPoint) => void;
  focusFrame: (
    pageId: string,
    frame: { x: number; y: number; width: number; height: number },
  ) => void;
  resetCamera: (pageId: string) => void;
  fitFrames: (
    pageId: string,
    frames: Array<{ x: number; y: number; width: number; height: number }>,
  ) => void;
  toggleLocked: (pageId: string) => void;
  setInteractionMode: (interactionMode: CanvasInteractionMode) => void;
  setPanModifierActive: (isPanModifierActive: boolean) => void;
}

const DEFAULT_PAGE_CANVAS_STATE: PageCanvasState = {
  camera: ORIGIN_CANVAS_CAMERA,
  isLocked: false,
};

const cameraAnimationTimeouts = new Map<string, number>();

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
          [pageId]: { ...page, camera, isCameraAnimating: false },
        },
      };
    }),
  focusFrame: (pageId, frame) => {
    set((state) => {
      if (state.viewportSize.width <= 0 || state.viewportSize.height <= 0) return state;
      const page = getPageCanvasState(state, pageId);
      const camera = constrainCanvasCamera(
        {
          ...page.camera,
          panX: state.viewportSize.width / 2 - (frame.x + frame.width / 2) * page.camera.zoom,
          panY: state.viewportSize.height / 2 - (frame.y + frame.height / 2) * page.camera.zoom,
        },
        state.viewportSize,
      );
      return {
        pages: {
          ...state.pages,
          [pageId]: { ...page, camera, isCameraAnimating: true },
        },
      };
    });
    finishCameraAnimation(set, pageId);
  },
  resetCamera: (pageId) => {
    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: {
          ...getPageCanvasState(state, pageId),
          camera: ORIGIN_CANVAS_CAMERA,
          isCameraAnimating: true,
        },
      },
    }));
    finishCameraAnimation(set, pageId);
  },
  fitFrames: (pageId, frames) =>
    set((state) => {
      if (!frames.length || state.viewportSize.width <= 0 || state.viewportSize.height <= 0) {
        return state;
      }
      const padding = 80;
      const minX = Math.min(...frames.map((frame) => frame.x));
      const minY = Math.min(...frames.map((frame) => frame.y));
      const maxX = Math.max(...frames.map((frame) => frame.x + frame.width));
      const maxY = Math.max(...frames.map((frame) => frame.y + frame.height));
      const contentWidth = Math.max(1, maxX - minX);
      const contentHeight = Math.max(1, maxY - minY);
      const zoom = Math.min(
        MAX_CANVAS_ZOOM,
        Math.max(
          MIN_CANVAS_ZOOM,
          Math.min(
            (state.viewportSize.width - padding * 2) / contentWidth,
            (state.viewportSize.height - padding * 2) / contentHeight,
          ),
        ),
      );
      const camera = constrainCanvasCamera(
        {
          zoom,
          panX: state.viewportSize.width / 2 - ((minX + maxX) / 2) * zoom,
          panY: state.viewportSize.height / 2 - ((minY + maxY) / 2) * zoom,
        },
        state.viewportSize,
      );
      const nextState = {
        pages: {
          ...state.pages,
          [pageId]: {
            ...getPageCanvasState(state, pageId),
            camera,
            isCameraAnimating: true,
          },
        },
      };
      finishCameraAnimation(set, pageId);
      return nextState;
    }),
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

function finishCameraAnimation(
  set: (partial: Partial<CanvasStore> | ((state: CanvasStore) => Partial<CanvasStore>)) => void,
  pageId: string,
) {
  const currentTimeout = cameraAnimationTimeouts.get(pageId);
  if (currentTimeout !== undefined) window.clearTimeout(currentTimeout);
  const timeoutId = window.setTimeout(() => {
    cameraAnimationTimeouts.delete(pageId);
    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: { ...getPageCanvasState(state, pageId), isCameraAnimating: false },
      },
    }));
  }, 360);
  cameraAnimationTimeouts.set(pageId, timeoutId);
}

export function getPageCanvasState(
  state: Pick<CanvasStore, 'pages'>,
  pageId: string,
): PageCanvasState {
  return state.pages[pageId] ?? DEFAULT_PAGE_CANVAS_STATE;
}
