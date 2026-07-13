import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useCanvasPan } from '../../app/useCanvasPan';
import { useCanvasViewport } from '../../app/useCanvasViewport';
import { getPageCanvasState, useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { registerCanvasElement } from '../../app/interactionElementRegistry';
import { useContextMenu } from '../../kit/context-menu';
import { ThemeIcon } from '../../kit/icon';
import type { ContextMenuItem } from '../../kit/context-menu';
import {
  clientPointToCanvasWorld,
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  getCanvasPanLimits,
} from '../../domain/canvasGeometry';
import { createBoxFrameCenteredAt } from '../../domain/placement';
import { isManagedGroupView, resolveGroupViewMode } from '../../domain/groupLayout';
import { isCollectionPageId, isRecycleBinPageId, isSystemPageId } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { WorkspaceBoxRenderer } from './WorkspaceBoxRenderer';
import { useCanvasTools } from './useCanvasTools';
import { CollectionPage } from '../collection/CollectionPage';
import { GroupScrollSurface } from '../group-views/GroupScrollSurface';

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
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const contextMenu = useContextMenu();
  const { items: canvasTools } = useCanvasTools();
  const { t } = useI18n();
  const isRecycleBin = isRecycleBinPageId(activePageId);
  const isCollection = isCollectionPageId(activePageId);
  const groupViewModes = useUiStore((state) => state.groupViewModes);
  // Group layout modes only apply to user pages; collection/recycle stay freeform.
  const activeGroupViewMode = isSystemPageId(activePageId)
    ? 'freeform'
    : resolveGroupViewMode(groupViewModes, activePageId);
  const systemPageEmpty =
    isRecycleBin && activePageBoxCount === 0
      ? {
          key: 'recycle-bin-empty',
          icon: <ThemeIcon name="trash" size={22} strokeWidth={1.75} />,
          label: t('page.recycleBinEmpty'),
        }
      : isCollection && isCollectionEmpty
        ? {
            key: 'collection-empty',
            icon: <ThemeIcon name="star" size={22} strokeWidth={1.75} />,
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
  const managedView = isManagedGroupView(activeGroupViewMode);
  const canvasClassName = [
    'cardo-canvas',
    isCollection ? 'cardo-canvas-collection' : '',
    isLocked ? 'cardo-canvas-locked' : '',
    !managedView && isPanModifierActive && !isLocked ? 'cardo-canvas-pan-ready' : '',
    !managedView && isPanning ? 'cardo-canvas-panning' : '',
    managedView ? `cardo-canvas-group-view-${activeGroupViewMode}` : '',
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
      data-group-view-mode={activeGroupViewMode}
      ref={setCanvasElement}
      onPointerDownCapture={managedView ? undefined : handlePointerDownCapture}
      onContextMenu={(event) => {
        if (event.target instanceof Element && event.target.closest('[data-canvas-box]')) {
          return;
        }

        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const camera = getPageCanvasState(useCanvasStore.getState(), activePageId).camera;
        const point = managedView
          ? { x: 40, y: 40 }
          : clientPointToCanvasWorld(event, rect, camera);
        const canCreate = !isRecycleBin && !isCollection;
        const tools: ContextMenuItem[] = [
          ...(!isRecycleBin && !isCollection
            ? [
                {
                  id: 'set-default-page',
                  label: t(activePageId === defaultPageId ? 'page.default' : 'page.setDefault'),
                  icon: <ThemeIcon name="home" size={16} />,
                  disabled: activePageId === defaultPageId,
                  onSelect: () => setDefaultPage(activePageId),
                },
              ]
            : []),
          ...(managedView ? [] : canvasTools),
        ];
        contextMenu.openMenu(event.clientX, event.clientY, [
          ...(canCreate
            ? [
                {
                  id: 'new-page',
                  label: t('menu.newPage'),
                  icon: <ThemeIcon name="panel" size={16} />,
                  onSelect: () => createPage(t('page.untitled')),
                },
                {
                  id: 'new-box',
                  label: t('menu.newBox'),
                  icon: <ThemeIcon name="add" size={16} />,
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
          className="cardo-page-scene"
          custom={pageTransitionDirection}
          key={activePageId}
          variants={pageSceneVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {isCollection ? (
            <CanvasWorld pageId={activePageId}>
              <div className="cardo-canvas-boundary" style={boundaryStyle} />
              <CollectionPage />
            </CanvasWorld>
          ) : managedView ? (
            <GroupScrollSurface pageId={activePageId} excludeBoxId={draggedBoxId} />
          ) : (
            <CanvasWorld pageId={activePageId}>
              <div className="cardo-canvas-boundary" style={boundaryStyle} />
              <PageBoxes
                pageId={activePageId}
                skipEntryAnimation={isPageSwitch}
                excludeBoxId={draggedBoxId}
              />
            </CanvasWorld>
          )}
          <AnimatePresence>
            {systemPageEmpty ? (
              <motion.div
                className="cardo-system-page-empty"
                key={systemPageEmpty.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <span className="cardo-system-page-empty-icon" aria-hidden="true">
                  {systemPageEmpty.icon}
                </span>
                <span className="cardo-system-page-empty-label">{systemPageEmpty.label}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.section>
      </AnimatePresence>
      {/*
        Dragged box lives outside page scenes so horizontal page-turn can run
        while the floating box stays under the pointer (fixed layer).
      */}
      <DraggedBoxLayer />
      {managedView ? null : <CanvasBoundaryFeedback pageId={activePageId} />}
    </main>
  );
}

function PageBoxes({
  pageId,
  skipEntryAnimation,
  excludeBoxId,
}: {
  pageId: string;
  skipEntryAnimation: boolean;
  excludeBoxId?: string | null;
}) {
  const allBoxes = useWorkspaceStore((state) => state.projection.boxes);
  const boxes = useMemo(
    () =>
      allBoxes.filter((box) => box.pageId === pageId && (!excludeBoxId || box.id !== excludeBoxId)),
    [allBoxes, excludeBoxId, pageId],
  );

  return boxes.map((box) => (
    <WorkspaceBoxRenderer
      box={box}
      key={box.id}
      skipEntryAnimation={skipEntryAnimation}
      layoutLocked={false}
    />
  ));
}

function DraggedBoxLayer() {
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const box = useWorkspaceStore((state) =>
    draggedBoxId
      ? (state.projection.boxes.find((entry) => entry.id === draggedBoxId) ?? null)
      : null,
  );
  if (!box) return null;
  return (
    <div className="cardo-dragged-box-layer" aria-hidden="true">
      <WorkspaceBoxRenderer box={box} skipEntryAnimation />
    </div>
  );
}

/**
 * Edge hit feedback during pan. Applies is-active via DOM only so pointer-rate
 * pan updates do not re-render React chrome.
 */
function CanvasBoundaryFeedback({ pageId }: { pageId: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isPanning = useCanvasStore((state) => state.interactionMode === 'panning');

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const edges = {
      left: root.querySelector('.cardo-canvas-edge-left'),
      right: root.querySelector('.cardo-canvas-edge-right'),
      top: root.querySelector('.cardo-canvas-edge-top'),
      bottom: root.querySelector('.cardo-canvas-edge-bottom'),
    };

    const apply = () => {
      const canvas = useCanvasStore.getState();
      const viewportSize = canvas.viewportSize;
      const panX = canvas.pages[pageId]?.camera.panX ?? 0;
      const panY = canvas.pages[pageId]?.camera.panY ?? 0;
      const panning = canvas.interactionMode === 'panning';
      const canShow = panning && viewportSize.width > 0 && viewportSize.height > 0;
      const limits = getCanvasPanLimits(viewportSize);
      edges.left?.classList.toggle('is-active', canShow && Math.abs(panX - limits.maxX) < 0.5);
      edges.right?.classList.toggle('is-active', canShow && Math.abs(panX - limits.minX) < 0.5);
      edges.top?.classList.toggle('is-active', canShow && Math.abs(panY - limits.maxY) < 0.5);
      edges.bottom?.classList.toggle('is-active', canShow && Math.abs(panY - limits.minY) < 0.5);
    };

    apply();
    return useCanvasStore.subscribe(apply);
  }, [pageId]);

  return (
    <div
      ref={rootRef}
      className="cardo-canvas-edge-feedback"
      aria-hidden="true"
      data-panning={isPanning ? 'true' : undefined}
    >
      <span className="cardo-canvas-edge cardo-canvas-edge-left" />
      <span className="cardo-canvas-edge cardo-canvas-edge-right" />
      <span className="cardo-canvas-edge cardo-canvas-edge-top" />
      <span className="cardo-canvas-edge cardo-canvas-edge-bottom" />
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
      world.classList.toggle('cardo-canvas-world-animating', Boolean(page.isCameraAnimating));
    };
    applyCamera();
    return useCanvasStore.subscribe(applyCamera);
  }, [pageId]);

  return (
    <div
      className={`cardo-canvas-world${initialPageState.isCameraAnimating ? ' cardo-canvas-world-animating' : ''}`}
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

/**
 * Horizontal page turn (not fade).
 * direction > 0 → navigating forward (higher tab order): enter from right, exit left.
 * direction < 0 → navigating backward: enter from left, exit right.
 * Runs during cross-page box drag too — the dragged box is portaled outside scenes.
 */
const PAGE_SLIDE_TRANSITION = {
  type: 'tween' as const,
  duration: 0.42,
  ease: [0.22, 0.82, 0.2, 1] as const,
};

const pageSceneVariants: Variants = {
  enter: (direction: number) => ({
    x: `${direction * 100}%`,
    opacity: 1,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: PAGE_SLIDE_TRANSITION,
  },
  exit: (direction: number) => ({
    x: `${direction * -100}%`,
    opacity: 1,
    transition: PAGE_SLIDE_TRANSITION,
  }),
};
