import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { useCanvasPan } from '../../app/useCanvasPan';
import { useCanvasViewport } from '../../app/useCanvasViewport';
import { getPageCanvasState, useCanvasStore } from '../../app/stores/canvasStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import {
  clientPointToCanvasWorld,
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
} from '../../domain/canvasGeometry';
import { createBoxFrameCenteredAt } from '../../domain/placement';
import {
  isCollectionPageId,
  isRecycleBinPageId,
  type WorkspaceBoxPreset,
} from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { useFloatingMenu } from '../floating-menu/useFloatingMenu';
import { WorkspaceBoxRenderer } from './WorkspaceBoxRenderer';
import { useCanvasLayoutTools } from './useCanvasLayoutTools';
import { CollectionPage } from '../collection/CollectionPage';

export function WorkspaceCanvas() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const createBox = useWorkspaceStore((state) => state.createBox);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const resetCamera = useCanvasStore((state) => state.resetCamera);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const canvasZoomEnabled = usePreferencesStore((state) => state.canvasZoomEnabled);
  const { openCanvasMenu } = useFloatingMenu();
  const { items: canvasLayoutItems } = useCanvasLayoutTools();
  const { t } = useI18n();
  const boxes = useMemo(
    () => snapshot.boxes.filter((box) => box.pageId === snapshot.activePageId),
    [snapshot.activePageId, snapshot.boxes],
  );
  const isRecycleBin = isRecycleBinPageId(snapshot.activePageId);
  const isCollection = isCollectionPageId(snapshot.activePageId);
  const previousActivePageIdRef = useRef(snapshot.activePageId);
  const canvasRef = useRef<HTMLElement>(null);
  const { handlePointerDownCapture, isLocked, isPanModifierActive, isPanning } = useCanvasPan(
    snapshot.activePageId,
  );
  useCanvasViewport(canvasRef);
  const canvasBounds = useMemo(() => createCanvasWorldBounds(viewportSize), [viewportSize]);
  const pageOrder = useMemo(
    () => [...snapshot.pages].sort((first, second) => first.order - second.order),
    [snapshot.pages],
  );
  const previousPageIndex = pageOrder.findIndex(
    (page) => page.id === previousActivePageIdRef.current,
  );
  const activePageIndex = pageOrder.findIndex((page) => page.id === snapshot.activePageId);
  const pageTransitionDirection = activePageIndex < previousPageIndex ? -1 : 1;
  const isPageSwitch = previousActivePageIdRef.current !== snapshot.activePageId;
  const canvasClassName = [
    'wbn-canvas',
    isCollection ? 'wbn-canvas-collection' : '',
    isLocked ? 'wbn-canvas-locked' : '',
    isPanModifierActive && !isLocked ? 'wbn-canvas-pan-ready' : '',
    isPanning ? 'wbn-canvas-panning' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const boundaryStyle = {
    left: canvasBounds.minX,
    top: canvasBounds.minY,
    width: canvasBounds.width,
    height: canvasBounds.height,
  } satisfies CSSProperties;

  useEffect(() => {
    previousActivePageIdRef.current = snapshot.activePageId;
  }, [snapshot.activePageId]);

  return (
    <main
      className={canvasClassName}
      data-workspace-canvas
      ref={canvasRef}
      onPointerDownCapture={handlePointerDownCapture}
      onWheel={(event) => {
        if (!canvasZoomEnabled) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const currentZoom = getPageCanvasState(useCanvasStore.getState(), snapshot.activePageId)
          .camera.zoom;
        setZoom(snapshot.activePageId, currentZoom * Math.exp(-event.deltaY * 0.0015), {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }}
      onContextMenu={(event) => {
        if (event.target instanceof Element && event.target.closest('[data-canvas-box]')) {
          return;
        }

        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const camera = getPageCanvasState(useCanvasStore.getState(), snapshot.activePageId).camera;
        const point = clientPointToCanvasWorld(event, rect, camera);
        openCanvasMenu(event.clientX, event.clientY, {
          ...(isRecycleBin || isCollection
            ? {}
            : {
                createPage: () => createPage(t('page.untitled')),
                createBox: (preset: WorkspaceBoxPreset) =>
                  createBox(
                    preset,
                    constrainBoxFrameToCanvas(createBoxFrameCenteredAt(point), canvasBounds),
                    getBoxPresetLabel(preset, t),
                  ),
              }),
          layoutItems: canvasLayoutItems,
          resetView: () => resetCamera(snapshot.activePageId),
        });
      }}
    >
      <AnimatePresence initial={false} mode="sync" custom={pageTransitionDirection}>
        <motion.section
          className="wbn-page-scene"
          custom={pageTransitionDirection}
          key={snapshot.activePageId}
          variants={pageSceneVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {isCollection ? (
            <CanvasWorld pageId={snapshot.activePageId}>
              <div className="wbn-canvas-boundary" style={boundaryStyle} />
              <CollectionPage />
            </CanvasWorld>
          ) : (
            <CanvasWorld pageId={snapshot.activePageId}>
              <div className="wbn-canvas-boundary" style={boundaryStyle} />
              {boxes.map((box) => (
                <WorkspaceBoxRenderer box={box} key={box.id} skipEntryAnimation={isPageSwitch} />
              ))}
            </CanvasWorld>
          )}
          <AnimatePresence>
            {isRecycleBin && boxes.length === 0 ? (
              <motion.div
                className="wbn-recycle-bin-empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <Trash2 size={22} />
                <span>{t('page.recycleBinEmpty')}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.section>
      </AnimatePresence>
    </main>
  );
}

function CanvasWorld({ pageId, children }: { pageId: string; children: ReactNode }) {
  const worldRef = useRef<HTMLDivElement>(null);
  const initialPageState = getPageCanvasState(useCanvasStore.getState(), pageId);
  const style = {
    transform: cameraTransform(initialPageState.camera),
    transformOrigin: '0 0',
  } satisfies CSSProperties;

  useLayoutEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const applyCamera = () => {
      const page = getPageCanvasState(useCanvasStore.getState(), pageId);
      world.style.transform = cameraTransform(page.camera);
      world.classList.toggle('wbn-canvas-world-animating', Boolean(page.isCameraAnimating));
    };
    applyCamera();
    return useCanvasStore.subscribe(applyCamera);
  }, [pageId]);

  return (
    <div
      className={`wbn-canvas-world${initialPageState.isCameraAnimating ? ' wbn-canvas-world-animating' : ''}`}
      ref={worldRef}
      style={style}
    >
      {children}
    </div>
  );
}

function cameraTransform(camera: { panX: number; panY: number; zoom: number }) {
  return `translate3d(${camera.panX}px, ${camera.panY}px, 0) scale(${camera.zoom})`;
}

const pageSceneVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 18, scale: 0.992 }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'tween', duration: 0.24, ease: [0.2, 0.8, 0.2, 1] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -12,
    scale: 0.996,
    transition: { type: 'tween', duration: 0.16, ease: [0.4, 0, 1, 1] },
  }),
};

function getBoxPresetLabel(preset: WorkspaceBoxPreset, t: ReturnType<typeof useI18n>['t']) {
  return preset === 'general'
    ? t('box.general')
    : preset === 'folder'
      ? t('box.folder')
      : preset === 'bookmark'
        ? t('box.bookmark')
        : t('box.clipboard');
}
