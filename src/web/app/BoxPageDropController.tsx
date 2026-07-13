/**
 * Box → page drop controller (collection add / user-page move / recycle-from rules).
 *
 * Hit region: getTopBarElement() is the primary nav (sidebar product-nav root in v2).
 * Per-page targets: registerPageDropElement / findPageDropAtPoint.
 * Store flags keep historical names (boxDragOverTopBar = over primary nav) until cutover rename.
 */
import { useEffect, useRef } from 'react';
import { createLatestFrameScheduler } from './motion/frameScheduler';
import { getPageCanvasState, useCanvasStore } from './stores/canvasStore';
import { useUiStore } from './stores/uiStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { startWindowPointerSession } from './windowPointerSession';
import {
  findPageDropAtPoint,
  getCanvasElement,
  getTopBarElement,
} from './interactionElementRegistry';
import {
  clientPointToCanvasWorld,
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  getCanvasViewportCenter,
  getVisibleCanvasWorldBounds,
} from '../domain/canvasGeometry';
import { findViewportAdaptiveFrame, isFrameInViewport } from '../domain/placement';
import {
  isManagedGroupView,
  reflowGroupBoxesAfterDrop,
  resolveGroupViewMode,
} from '../domain/groupLayout';
import type { BoxFrame } from '../domain/workspace';
import { isCollectionPageId, isRecycleBinPageId, isSystemPageId } from '../domain/workspace';

export function BoxPageDropController() {
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const originPageIdRef = useRef<string | null>(null);
  const previewPageIdRef = useRef<string | null>(null);
  const didOptimisticPreviewRef = useRef(false);

  useEffect(() => {
    if (!draggedBoxId) {
      originPageIdRef.current = null;
      previewPageIdRef.current = null;
      didOptimisticPreviewRef.current = false;
      return;
    }

    const workspaceAtStart = useWorkspaceStore.getState();
    const movingAtStart = workspaceAtStart.projection.boxes.find((box) => box.id === draggedBoxId);
    originPageIdRef.current = movingAtStart?.pageId ?? null;
    previewPageIdRef.current = movingAtStart?.pageId ?? null;
    didOptimisticPreviewRef.current = false;

    const ui = useUiStore.getState();
    // Primary nav / sidebar bounds (registry symbol still named top bar).
    let topBarRect = getTopBarElement()?.getBoundingClientRect();
    const updateTopBarRect = () => {
      topBarRect = getTopBarElement()?.getBoundingClientRect();
    };
    const topBarObserver = new ResizeObserver(updateTopBarRect);
    const topBar = getTopBarElement();
    if (topBar) topBarObserver.observe(topBar);
    /** True when pointer is over the primary nav hit region (sidebar). */
    const resolveTopBarHover = (clientX: number, clientY: number) =>
      Boolean(
        topBarRect &&
        clientX >= topBarRect.left - 8 &&
        clientX <= topBarRect.right + 8 &&
        clientY >= topBarRect.top - 10 &&
        clientY <= topBarRect.bottom + 10,
      );

    /**
     * Hover only patches local projection so the active page, page scene, and
     * floating box switch together in the same frame. Runtime write happens on release.
     */
    const previewPageUnderPointer = (clientX: number, clientY: number, pageId: string | null) => {
      if (!pageId || isCollectionPageId(pageId)) return;

      const workspace = useWorkspaceStore.getState();
      const movingBox = workspace.projection.boxes.find((box) => box.id === draggedBoxId);
      if (!movingBox) return;

      if (previewPageIdRef.current === pageId && movingBox.pageId === pageId) {
        return;
      }

      const dragSession = useUiStore.getState().boxDragSession;
      const sizeSource = dragSession?.latestFrame ?? movingBox.frame;
      const transformOrigin = dragSession?.transformOrigin ?? '50% 50%';
      const nextFrame = framePreservingGrabUnderPointer(
        clientX,
        clientY,
        pageId,
        sizeSource,
        transformOrigin,
      );
      if (!nextFrame) return;

      useUiStore.getState().rebaseBoxDragSession(nextFrame, clientX, clientY);
      workspace.previewBoxOnPage(draggedBoxId, pageId, nextFrame);
      previewPageIdRef.current = pageId;
      didOptimisticPreviewRef.current = true;
    };

    const updateDropTarget = ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      const overTopBar = resolveTopBarHover(clientX, clientY);
      const pageId = overTopBar ? findPageDropAtPoint(clientX, clientY) : null;
      ui.setBoxDragOverTopBar(overTopBar);
      ui.setBoxDropPage(pageId);
      if (overTopBar) {
        previewPageUnderPointer(clientX, clientY, pageId);
      }
    };

    const frameScheduler = createLatestFrameScheduler(updateDropTarget);
    const dragPointerId = useUiStore.getState().boxDragSession?.pointerId;
    const session = startWindowPointerSession({
      // Same pointer as box paint session — ignore other fingers / stray events.
      pointerId: dragPointerId,
      onMove: (event) =>
        frameScheduler.schedule({ clientX: event.clientX, clientY: event.clientY }),
      onEnd: (reason, event) => {
        if (reason === 'pointerup' && event instanceof PointerEvent) {
          commitBoxDragRelease(draggedBoxId, event, originPageIdRef.current);
        } else if (didOptimisticPreviewRef.current) {
          void useWorkspaceStore.getState().revertOptimisticProjection();
        }
        useUiStore.getState().endBoxDrag();
      },
    });

    window.addEventListener('resize', updateTopBarRect);
    return () => {
      frameScheduler.cancel();
      topBarObserver.disconnect();
      window.removeEventListener('resize', updateTopBarRect);
      session.dispose();
    };
  }, [draggedBoxId]);

  return null;
}

function commitBoxDragRelease(
  draggedBoxId: string,
  event: PointerEvent,
  originPageId: string | null,
) {
  const ui = useUiStore.getState();
  const workspace = useWorkspaceStore.getState();
  const movingBox = workspace.projection.boxes.find((box) => box.id === draggedBoxId);
  const dragSession = ui.boxDragSession;
  if (!movingBox || !dragSession) return;

  // Nav row page under pointer (favorites / user page / recycle), not canvas.
  const tabPageId = findPageDropAtPoint(event.clientX, event.clientY) ?? ui.boxDropPageId;

  if (tabPageId && isCollectionPageId(tabPageId)) {
    if (isRecycleBinPageId(movingBox.pageId) || isRecycleBinPageId(originPageId ?? '')) return;
    // Roll back local page preview before collection write (box stays on origin page).
    if (originPageId && movingBox.pageId !== originPageId) {
      workspace.previewBoxOnPage(draggedBoxId, originPageId, dragSession.latestFrame);
    }
    workspace.addBoxToCollection(draggedBoxId);
    ui.selectBox(null);
    workspace.setActivePage(tabPageId);
    return;
  }

  const destinationPageId =
    tabPageId && !isCollectionPageId(tabPageId) ? tabPageId : movingBox.pageId;
  const canvas = useCanvasStore.getState();
  const pageCanvas = getPageCanvasState(canvas, destinationPageId);
  const viewportBounds = getVisibleCanvasWorldBounds(pageCanvas.camera, canvas.viewportSize);
  const canvasBounds = createCanvasWorldBounds(canvas.viewportSize);
  // Released over primary nav / sidebar with a concrete page target.
  const releasedOnTab = Boolean(tabPageId) && ui.boxDragOverTopBar;

  // Drag tracking already wrote world coords into latestFrame (client-delta based).
  // Do NOT reproject from the pointer — that fights pan/scale/lift and causes a
  // visible snap/bounce on every release.
  const dragFrame = constrainBoxFrameToCanvas(dragSession.latestFrame, canvasBounds);

  // Normal canvas drag: keep the frame the user already sees.
  // Cross-page nav release: auto-place in the viewport (free-slot when crowded).
  // Off-screen non-nav drop: pull back into the viewport without mutual exclusion.
  let landingFrame: BoxFrame;
  if (releasedOnTab) {
    const occupiedFrames = workspace.projection.boxes
      .filter((box) => box.pageId === destinationPageId && box.id !== draggedBoxId)
      .map((box) => box.frame);
    landingFrame = findViewportAdaptiveFrame({
      size: { width: dragFrame.width, height: dragFrame.height },
      preferredCenter: getCanvasViewportCenter(pageCanvas.camera, canvas.viewportSize),
      viewportBounds,
      canvasBounds,
      occupiedFrames,
    });
  } else if (isFrameInViewport(dragFrame, viewportBounds)) {
    landingFrame = dragFrame;
  } else {
    landingFrame = findViewportAdaptiveFrame({
      size: { width: dragFrame.width, height: dragFrame.height },
      preferredCenter: {
        x: dragFrame.x + dragFrame.width / 2,
        y: dragFrame.y + dragFrame.height / 2,
      },
      viewportBounds,
      canvasBounds,
    });
  }

  const destMode = isSystemPageId(destinationPageId)
    ? 'freeform'
    : resolveGroupViewMode(ui.groupViewModes, destinationPageId);
  const managedDest = isManagedGroupView(destMode);

  // Managed layouts: reorder/reflow on release (no freeform free placement).
  if (managedDest && !releasedOnTab && (destMode === 'waterfall' || destMode === 'list')) {
    commitManagedLayoutDrop({
      draggedBoxId,
      destinationPageId,
      originPageId,
      dropFrame: dragFrame,
      mode: destMode,
      viewportWidth: canvas.viewportSize.width > 0 ? canvas.viewportSize.width : 960,
    });
    return;
  }

  // Only animate when landing actually moves (tab place / pull-in). Same-spot drop snaps.
  const moved =
    Math.abs(landingFrame.x - dragSession.latestFrame.x) > 1 ||
    Math.abs(landingFrame.y - dragSession.latestFrame.y) > 1;
  if (moved && !managedDest) {
    ui.setPendingBoxLanding(draggedBoxId, landingFrame);
  }

  // Projection may already show destination via optimistic preview; Runtime still
  // holds origin until this write. Compare against drag-start page, not projection.
  const persistedPageId = originPageId ?? movingBox.pageId;
  if (persistedPageId !== destinationPageId) {
    // Align local projection before the async write so landing springs from the right page.
    if (movingBox.pageId !== destinationPageId) {
      workspace.previewBoxOnPage(draggedBoxId, destinationPageId, landingFrame);
    }
    void workspace
      .moveBoxToPage(draggedBoxId, destinationPageId, landingFrame)
      .then(() => {
        if (managedDest) {
          reflowManagedPage(destinationPageId, draggedBoxId, landingFrame);
        }
      })
      .catch(() => {
        void workspace.revertOptimisticProjection();
      });
    return;
  }

  if (workspace.projection.activePageId !== destinationPageId) {
    workspace.setActivePage(destinationPageId);
  }
  if (managedDest) {
    reflowManagedPage(destinationPageId, draggedBoxId, landingFrame);
    return;
  }
  workspace.updateBoxFrame(draggedBoxId, landingFrame);
}

function commitManagedLayoutDrop(args: {
  draggedBoxId: string;
  destinationPageId: string;
  originPageId: string | null;
  dropFrame: BoxFrame;
  mode: 'waterfall' | 'list';
  viewportWidth: number;
}) {
  const { draggedBoxId, destinationPageId, originPageId, dropFrame, mode, viewportWidth } = args;
  const workspace = useWorkspaceStore.getState();
  const movingBox = workspace.projection.boxes.find((box) => box.id === draggedBoxId);
  if (!movingBox) return;

  const persistedPageId = originPageId ?? movingBox.pageId;
  if (persistedPageId !== destinationPageId) {
    if (movingBox.pageId !== destinationPageId) {
      workspace.previewBoxOnPage(draggedBoxId, destinationPageId, dropFrame);
    }
    void workspace
      .moveBoxToPage(draggedBoxId, destinationPageId, dropFrame)
      .then(() =>
        reflowManagedPage(destinationPageId, draggedBoxId, dropFrame, mode, viewportWidth),
      )
      .catch(() => {
        void workspace.revertOptimisticProjection();
      });
    return;
  }

  if (workspace.projection.activePageId !== destinationPageId) {
    workspace.setActivePage(destinationPageId);
  }
  reflowManagedPage(destinationPageId, draggedBoxId, dropFrame, mode, viewportWidth);
}

function reflowManagedPage(
  pageId: string,
  draggedId: string,
  dropFrame: BoxFrame,
  modeHint?: 'waterfall' | 'list',
  viewportWidthHint?: number,
) {
  const workspace = useWorkspaceStore.getState();
  const ui = useUiStore.getState();
  const canvas = useCanvasStore.getState();
  const resolved =
    modeHint ??
    (isSystemPageId(pageId) ? 'freeform' : resolveGroupViewMode(ui.groupViewModes, pageId));
  if (resolved !== 'waterfall' && resolved !== 'list') return;
  const mode = resolved;

  const viewportWidth =
    viewportWidthHint ?? (canvas.viewportSize.width > 0 ? canvas.viewportSize.width : 960);
  const pageBoxes = workspace.projection.boxes.filter((box) => box.pageId === pageId);
  const frames = reflowGroupBoxesAfterDrop({
    boxes: pageBoxes,
    draggedId,
    dropFrame,
    mode,
    viewportWidth,
  });

  for (const box of pageBoxes) {
    const next = frames.get(box.id);
    if (!next) continue;
    if (
      next.x !== box.frame.x ||
      next.y !== box.frame.y ||
      next.width !== box.frame.width ||
      next.height !== box.frame.height
    ) {
      workspace.updateBoxFrame(box.id, next);
    }
  }
}

/**
 * Convert the pointer into a destination-page world frame so the grab point
 * (transform origin) stays under the cursor. This is camera-invariant and avoids
 * recentering jumps when the active page switches mid-drag.
 */
function framePreservingGrabUnderPointer(
  clientX: number,
  clientY: number,
  pageId: string,
  sizeSource: BoxFrame,
  transformOrigin: string,
): BoxFrame | null {
  const canvas = useCanvasStore.getState();
  const canvasRect = getCanvasElement()?.getBoundingClientRect();
  if (!canvasRect) return null;

  const pageCanvas = getPageCanvasState(canvas, pageId);
  const pointerWorld = clientPointToCanvasWorld(
    { clientX, clientY },
    canvasRect,
    pageCanvas.camera,
  );
  const grabLocal = resolveGrabLocalOffset(transformOrigin, sizeSource);

  return constrainBoxFrameToCanvas(
    {
      ...sizeSource,
      x: Math.round(pointerWorld.x - grabLocal.x),
      y: Math.round(pointerWorld.y - grabLocal.y),
    },
    createCanvasWorldBounds(canvas.viewportSize),
  );
}

function resolveGrabLocalOffset(origin: string, frame: BoxFrame) {
  const [rawX = '50%', rawY = '50%'] = origin.trim().split(/\s+/);
  return {
    x: parseOriginToken(rawX, frame.width),
    y: parseOriginToken(rawY, frame.height),
  };
}

function parseOriginToken(token: string, size: number) {
  if (token.endsWith('%')) {
    const percent = Number.parseFloat(token);
    return Number.isFinite(percent) ? (size * percent) / 100 : size / 2;
  }
  const pixels = Number.parseFloat(token);
  return Number.isFinite(pixels) ? pixels : size / 2;
}
