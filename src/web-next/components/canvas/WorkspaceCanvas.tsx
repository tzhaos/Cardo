import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { House, Trash2 } from 'lucide-react';
import { useCanvasPan } from '../../app/useCanvasPan';
import { useCanvasViewport } from '../../app/useCanvasViewport';
import { getPageCanvasState, useCanvasStore } from '../../app/stores/canvasStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { registerCanvasElement } from '../../app/interactionElementRegistry';
import {
  clientPointToCanvasWorld,
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  getCanvasPanLimits,
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
import { useCanvasTools } from './useCanvasTools';
import { CollectionPage } from '../collection/CollectionPage';

export function WorkspaceCanvas() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const createBox = useWorkspaceStore((state) => state.createBox);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const setDefaultPage = useWorkspaceStore((state) => state.setDefaultPage);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const { openCanvasMenu } = useFloatingMenu();
  const { items: canvasTools } = useCanvasTools();
  const { t } = useI18n();
  const boxes = useMemo(
    () => snapshot.boxes.filter((box) => box.pageId === snapshot.activePageId),
    [snapshot.activePageId, snapshot.boxes],
  );
  const isRecycleBin = isRecycleBinPageId(snapshot.activePageId);
  const isCollection = isCollectionPageId(snapshot.activePageId);
  const previousActivePageIdRef = useRef(snapshot.activePageId);
  const canvasRef = useRef<HTMLElement>(null);
  const setCanvasElement = useCallback((element: HTMLElement | null) => {
    canvasRef.current = element;
    registerCanvasElement(element);
  }, []);
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
      ref={setCanvasElement}
      onPointerDownCapture={handlePointerDownCapture}
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
          canvasTools: [
            ...(!isRecycleBin && !isCollection
              ? [
                  {
                    id: 'set-default-page',
                    label: t(
                      snapshot.activePageId === snapshot.defaultPageId
                        ? 'page.default'
                        : 'page.setDefault',
                    ),
                    icon: <House size={16} />,
                    disabled: snapshot.activePageId === snapshot.defaultPageId,
                    onSelect: () => setDefaultPage(snapshot.activePageId),
                  },
                ]
              : []),
            ...canvasTools,
          ],
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
      <CanvasBoundaryFeedback pageId={snapshot.activePageId} />
    </main>
  );
}

function CanvasBoundaryFeedback({ pageId }: { pageId: string }) {
  const panX = useCanvasStore((state) => state.pages[pageId]?.camera.panX ?? 0);
  const panY = useCanvasStore((state) => state.pages[pageId]?.camera.panY ?? 0);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const isPanning = useCanvasStore((state) => state.interactionMode === 'panning');
  const limits = useMemo(() => getCanvasPanLimits(viewportSize), [viewportSize]);
  const canShow = isPanning && viewportSize.width > 0 && viewportSize.height > 0;
  const atLeft = canShow && Math.abs(panX - limits.maxX) < 0.5;
  const atRight = canShow && Math.abs(panX - limits.minX) < 0.5;
  const atTop = canShow && Math.abs(panY - limits.maxY) < 0.5;
  const atBottom = canShow && Math.abs(panY - limits.minY) < 0.5;

  return (
    <div className="wbn-canvas-edge-feedback" aria-hidden="true">
      <span className={`wbn-canvas-edge wbn-canvas-edge-left${atLeft ? ' is-active' : ''}`} />
      <span className={`wbn-canvas-edge wbn-canvas-edge-right${atRight ? ' is-active' : ''}`} />
      <span className={`wbn-canvas-edge wbn-canvas-edge-top${atTop ? ' is-active' : ''}`} />
      <span className={`wbn-canvas-edge wbn-canvas-edge-bottom${atBottom ? ' is-active' : ''}`} />
    </div>
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
  return `translate3d(${camera.panX}px, ${camera.panY}px, 0)`;
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
