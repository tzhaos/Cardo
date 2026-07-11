import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { House, PanelTop, Plus, Star, Trash2 } from 'lucide-react';
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
import { isCollectionPageId, isRecycleBinPageId } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { useContextMenu, type ContextMenuItem } from '../../ui/khaos/context-menu';
import { WorkspaceBoxRenderer } from './WorkspaceBoxRenderer';
import { useCanvasTools } from './useCanvasTools';
import { CollectionPage } from '../collection/CollectionPage';

export function WorkspaceCanvas() {
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const defaultPageId = useWorkspaceStore((state) => state.projection.defaultPageId);
  const pageRows = useWorkspaceStore((state) => state.projection.pages);
  const activePageBoxCount = useWorkspaceStore(
    (state) => state.projection.boxes.filter((box) => box.pageId === activePageId).length,
  );
  const isCollectionEmpty = useWorkspaceStore((state) => {
    const boxesById = new Map(state.projection.boxes.map((box) => [box.id, box]));
    return !state.projection.collectionBoxIds.some((boxId) => {
      const box = boxesById.get(boxId);
      return Boolean(
        box && state.projection.collectionViews[boxId] && !isRecycleBinPageId(box.pageId),
      );
    });
  });
  const createBox = useWorkspaceStore((state) => state.createBox);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const setDefaultPage = useWorkspaceStore((state) => state.setDefaultPage);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const contextMenu = useContextMenu();
  const { items: canvasTools } = useCanvasTools();
  const { t } = useI18n();
  const isRecycleBin = isRecycleBinPageId(activePageId);
  const isCollection = isCollectionPageId(activePageId);
  const systemPageEmpty =
    isRecycleBin && activePageBoxCount === 0
      ? {
          key: 'recycle-bin-empty',
          icon: <Trash2 size={22} strokeWidth={1.75} />,
          label: t('page.recycleBinEmpty'),
        }
      : isCollection && isCollectionEmpty
        ? {
            key: 'collection-empty',
            icon: <Star size={22} strokeWidth={1.75} />,
            label: t('page.collectionEmpty'),
          }
        : null;
  const previousActivePageIdRef = useRef(activePageId);
  const canvasRef = useRef<HTMLElement>(null);
  const setCanvasElement = useCallback((element: HTMLElement | null) => {
    canvasRef.current = element;
    registerCanvasElement(element);
  }, []);
  const { handlePointerDownCapture, isLocked, isPanModifierActive, isPanning } =
    useCanvasPan(activePageId);
  useCanvasViewport(canvasRef);
  const canvasBounds = useMemo(() => createCanvasWorldBounds(viewportSize), [viewportSize]);
  const pageOrder = useMemo(
    () => [...pageRows].sort((first, second) => first.order - second.order),
    [pageRows],
  );
  const previousPageIndex = pageOrder.findIndex(
    (page) => page.id === previousActivePageIdRef.current,
  );
  const activePageIndex = pageOrder.findIndex((page) => page.id === activePageId);
  const pageTransitionDirection = activePageIndex < previousPageIndex ? -1 : 1;
  const isPageSwitch = previousActivePageIdRef.current !== activePageId;
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
    previousActivePageIdRef.current = activePageId;
  }, [activePageId]);

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
        const camera = getPageCanvasState(useCanvasStore.getState(), activePageId).camera;
        const point = clientPointToCanvasWorld(event, rect, camera);
        const canCreate = !isRecycleBin && !isCollection;
        const tools: ContextMenuItem[] = [
          ...(!isRecycleBin && !isCollection
            ? [
                {
                  id: 'set-default-page',
                  label: t(activePageId === defaultPageId ? 'page.default' : 'page.setDefault'),
                  icon: <House size={16} />,
                  disabled: activePageId === defaultPageId,
                  onSelect: () => setDefaultPage(activePageId),
                },
              ]
            : []),
          ...canvasTools,
        ];
        contextMenu.openMenu(event.clientX, event.clientY, [
          ...(canCreate
            ? [
                {
                  id: 'new-page',
                  label: t('menu.newPage'),
                  icon: <PanelTop size={16} />,
                  onSelect: () => createPage(t('page.untitled')),
                },
                {
                  id: 'new-box',
                  label: t('menu.newBox'),
                  icon: <Plus size={16} />,
                  onSelect: () =>
                    createBox(
                      constrainBoxFrameToCanvas(createBoxFrameCenteredAt(point), canvasBounds),
                      t('box.general'),
                    ),
                },
              ]
            : []),
          ...tools.map((item, index) => ({
            ...item,
            separatorBefore: index === 0 && canCreate ? true : item.separatorBefore,
          })),
        ]);
      }}
    >
      <AnimatePresence initial={false} mode="sync" custom={pageTransitionDirection}>
        <motion.section
          className="wbn-page-scene"
          custom={pageTransitionDirection}
          key={activePageId}
          variants={pageSceneVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {isCollection ? (
            <CanvasWorld pageId={activePageId}>
              <div className="wbn-canvas-boundary" style={boundaryStyle} />
              <CollectionPage />
            </CanvasWorld>
          ) : (
            <CanvasWorld pageId={activePageId}>
              <div className="wbn-canvas-boundary" style={boundaryStyle} />
              <PageBoxes pageId={activePageId} skipEntryAnimation={isPageSwitch} />
            </CanvasWorld>
          )}
          <AnimatePresence>
            {systemPageEmpty ? (
              <motion.div
                className="wbn-system-page-empty"
                key={systemPageEmpty.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <span className="wbn-system-page-empty-icon" aria-hidden="true">
                  {systemPageEmpty.icon}
                </span>
                <span className="wbn-system-page-empty-label">{systemPageEmpty.label}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.section>
      </AnimatePresence>
      <CanvasBoundaryFeedback pageId={activePageId} />
      {contextMenu.menu}
    </main>
  );
}

function PageBoxes({
  pageId,
  skipEntryAnimation,
}: {
  pageId: string;
  skipEntryAnimation: boolean;
}) {
  const allBoxes = useWorkspaceStore((state) => state.projection.boxes);
  const boxes = useMemo(() => allBoxes.filter((box) => box.pageId === pageId), [allBoxes, pageId]);

  return boxes.map((box) => (
    <WorkspaceBoxRenderer box={box} key={box.id} skipEntryAnimation={skipEntryAnimation} />
  ));
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

function cameraTransform(camera: { panX: number; panY: number; zoom?: number }) {
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
