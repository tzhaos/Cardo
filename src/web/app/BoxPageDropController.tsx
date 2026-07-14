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
import { usePreferencesStore } from './stores/preferencesStore';
import { showToast } from './stores/toastStore';
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
import { resolveFreeformDropFrame } from '../domain/freeformLayout';
import { findViewportAdaptiveFrame, isFrameInViewport } from '../domain/placement';
import {
  clientPointToGroupScrollContent,
  isManagedGroupView,
  reflowGroupBoxesAfterDrop,
  resolveGroupViewMode,
} from '../domain/groupLayout';
import type { BoxFrame } from '../domain/workspace';
import { isCollectionPageId, isRecycleBinPageId, isSystemPageId } from '../domain/workspace';
import { updateManagedInsertPreview } from '../features/canvas/managedInsertPreview';
import { translateWebNext } from '../i18n/messages';

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

    const revertOptimisticPreviewToOrigin = () => {
      if (!didOptimisticPreviewRef.current) return;
      const workspace = useWorkspaceStore.getState();
      const origin = originPageIdRef.current;
      const session = useUiStore.getState().boxDragSession;
      if (origin && session) {
        workspace.previewBoxOnPage(draggedBoxId, origin, session.latestFrame);
        previewPageIdRef.current = origin;
        didOptimisticPreviewRef.current = false;
      } else {
        void workspace.revertOptimisticProjection();
        didOptimisticPreviewRef.current = false;
        previewPageIdRef.current = null;
      }
    };

    const updateDropTarget = ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      const overTopBar = resolveTopBarHover(clientX, clientY);
      const pageId = overTopBar ? findPageDropAtPoint(clientX, clientY) : null;
      ui.setBoxDragOverTopBar(overTopBar);
      ui.setBoxDropPage(pageId);
      if (overTopBar && pageId) {
        previewPageUnderPointer(clientX, clientY, pageId);
      } else if (overTopBar && pageId === null) {
        // Gap between page rows / nav chrome: do not keep a sticky page preview.
        revertOptimisticPreviewToOrigin();
      } else {
        // Left primary nav: undo optimistic cross-page preview so release on canvas
        // cannot silently migrate the box to a group the user only hovered.
        revertOptimisticPreviewToOrigin();
        // Keep managed drop landing in sync even if morph ghost session lags.
        updateManagedInsertPreview(clientX, clientY);
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
      // dispose() does not run onEnd — if we still hold an optimistic cross-page
      // preview, revert so pageId/frame do not stick after external endBoxDrag.
      session.dispose();
      if (didOptimisticPreviewRef.current && useUiStore.getState().draggedBoxId === draggedBoxId) {
        void useWorkspaceStore.getState().revertOptimisticProjection();
        useUiStore.getState().endBoxDrag();
      } else if (didOptimisticPreviewRef.current && !useUiStore.getState().draggedBoxId) {
        // Drag already ended without commit path — still clear bad projection.
        void useWorkspaceStore.getState().revertOptimisticProjection();
      }
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
    // Stay on origin page — favorites add is non-navigating.
    const locale = usePreferencesStore.getState().locale;
    showToast(translateWebNext(locale, 'toast.addedToFavorites'), 'success');
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

  // Freeform: snap to grid + min gap (no overlap). Managed handled above.
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
  } else {
    const occupied = workspace.projection.boxes
      .filter((box) => box.pageId === destinationPageId && box.id !== draggedBoxId)
      .map((box) => box.frame);
    const preferred = isFrameInViewport(dragFrame, viewportBounds)
      ? dragFrame
      : findViewportAdaptiveFrame({
          size: { width: dragFrame.width, height: dragFrame.height },
          preferredCenter: {
            x: dragFrame.x + dragFrame.width / 2,
            y: dragFrame.y + dragFrame.height / 2,
          },
          viewportBounds,
          canvasBounds,
        });
    landingFrame = resolveFreeformDropFrame({
      frame: preferred,
      occupied,
      bounds: canvasBounds,
    });
  }

  const destMode = isSystemPageId(destinationPageId)
    ? 'freeform'
    : resolveGroupViewMode(workspace.projection.pages, destinationPageId);
  const managedDest = isManagedGroupView(destMode);

  // Managed layouts: reorder/reflow on release (no freeform free placement).
  if (managedDest && !releasedOnTab && (destMode === 'waterfall' || destMode === 'list')) {
    const dropPoint = clientPointToGroupScrollContent(event.clientX, event.clientY) ?? {
      x: dragFrame.x + dragFrame.width / 2,
      y: dragFrame.y + dragFrame.height / 2,
    };
    commitManagedLayoutDrop({
      draggedBoxId,
      destinationPageId,
      originPageId,
      dropPoint,
      mode: destMode,
      viewportWidth: canvas.viewportSize.width > 0 ? canvas.viewportSize.width : 960,
    });
    return;
  }

  // Only animate meaningful landings (cross-page tab place / off-screen pull-in).
  // Same-page freeform: never arm pendingBoxLanding — snap avoids drop flash.
  const moved =
    Math.abs(landingFrame.x - dragSession.latestFrame.x) > 1 ||
    Math.abs(landingFrame.y - dragSession.latestFrame.y) > 1;
  const crossPageLanding =
    (originPageId ?? movingBox.pageId) !== destinationPageId || releasedOnTab;
  if (
    moved &&
    !managedDest &&
    (crossPageLanding || !isFrameInViewport(dragFrame, viewportBounds))
  ) {
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
      .catch((error: unknown) => {
        console.error('Cardo command failed', error);
        void workspace.revertOptimisticProjection();
        const locale = usePreferencesStore.getState().locale;
        showToast(translateWebNext(locale, 'toast.commandFailed'), 'error');
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
  dropPoint: { x: number; y: number };
  mode: 'waterfall' | 'list';
  viewportWidth: number;
}) {
  const { draggedBoxId, destinationPageId, originPageId, dropPoint, mode, viewportWidth } = args;
  const workspace = useWorkspaceStore.getState();
  const movingBox = workspace.projection.boxes.find((box) => box.id === draggedBoxId);
  if (!movingBox) return;

  // Temporary frame until reflow writes the real slot.
  const seedFrame: BoxFrame = {
    x: dropPoint.x,
    y: dropPoint.y,
    width: movingBox.frame.width,
    height: movingBox.frame.height,
  };

  const persistedPageId = originPageId ?? movingBox.pageId;
  if (persistedPageId !== destinationPageId) {
    if (movingBox.pageId !== destinationPageId) {
      workspace.previewBoxOnPage(draggedBoxId, destinationPageId, seedFrame);
    }
    void workspace
      .moveBoxToPage(draggedBoxId, destinationPageId, seedFrame)
      .then(() =>
        reflowManagedPage(destinationPageId, draggedBoxId, dropPoint, mode, viewportWidth),
      )
      .catch((error: unknown) => {
        console.error('Cardo command failed', error);
        void workspace.revertOptimisticProjection();
        const locale = usePreferencesStore.getState().locale;
        showToast(translateWebNext(locale, 'toast.commandFailed'), 'error');
      });
    return;
  }

  if (workspace.projection.activePageId !== destinationPageId) {
    workspace.setActivePage(destinationPageId);
  }
  reflowManagedPage(destinationPageId, draggedBoxId, dropPoint, mode, viewportWidth);
}

function reflowManagedPage(
  pageId: string,
  draggedId: string,
  dropPoint: { x: number; y: number },
  modeHint?: 'waterfall' | 'list',
  viewportWidthHint?: number,
) {
  const workspace = useWorkspaceStore.getState();
  const ui = useUiStore.getState();
  const canvas = useCanvasStore.getState();
  const resolved =
    modeHint ??
    (isSystemPageId(pageId)
      ? 'freeform'
      : resolveGroupViewMode(workspace.projection.pages, pageId));
  if (resolved !== 'waterfall' && resolved !== 'list') return;
  const mode = resolved;

  const viewportWidth =
    viewportWidthHint ?? (canvas.viewportSize.width > 0 ? canvas.viewportSize.width : 960);
  const pageBoxes = workspace.projection.boxes.filter((box) => box.pageId === pageId);

  // Prefer live landing insertIndex so commit matches what the user saw.
  const preview = ui.managedInsertPreview;
  const insertIndex =
    preview && preview.pageId === pageId && preview.mode === mode ? preview.insertIndex : undefined;

  const frames = reflowGroupBoxesAfterDrop({
    boxes: pageBoxes,
    draggedId,
    dropPoint,
    mode,
    viewportWidth,
    insertIndex,
  });

  const changed: Record<string, BoxFrame> = {};
  for (const box of pageBoxes) {
    const next = frames.get(box.id);
    if (!next) continue;
    if (
      next.x === box.frame.x &&
      next.y === box.frame.y &&
      next.width === box.frame.width &&
      next.height === box.frame.height
    ) {
      continue;
    }
    changed[box.id] = next;
  }
  if (Object.keys(changed).length === 0) return;

  // Managed mode only — freeform columns untouched (layout isolation).
  workspace.arrangeBoxesOnPage(pageId, changed, mode);
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
