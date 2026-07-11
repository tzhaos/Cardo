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
import type { BoxFrame } from '../domain/workspace';
import { isCollectionPageId, isRecycleBinPageId } from '../domain/workspace';

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
    let topBarRect = getTopBarElement()?.getBoundingClientRect();
    const updateTopBarRect = () => {
      topBarRect = getTopBarElement()?.getBoundingClientRect();
    };
    const topBarObserver = new ResizeObserver(updateTopBarRect);
    const topBar = getTopBarElement();
    if (topBar) topBarObserver.observe(topBar);
    const resolveTopBarHover = (clientX: number, clientY: number) =>
      Boolean(
        topBarRect &&
        clientX >= topBarRect.left - 8 &&
        clientX <= topBarRect.right + 8 &&
        clientY >= topBarRect.top - 10 &&
        clientY <= topBarRect.bottom + 10,
      );

    /**
     * Hover only patches local projection so the active tab, page scene, and
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
    const session = startWindowPointerSession({
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

  const pointerFrame =
    framePreservingGrabUnderPointer(
      event.clientX,
      event.clientY,
      destinationPageId,
      dragSession.latestFrame,
      dragSession.transformOrigin,
    ) ?? dragSession.latestFrame;

  const releasedOnTab = Boolean(tabPageId) && ui.boxDragOverTopBar;

  // Normal canvas drag: keep the pointer frame (overlap allowed). Only clamp to world.
  // Cross-page tab release: auto-place in the viewport, avoiding other boxes when possible.
  // Off-screen non-tab drop: pull back into the viewport without mutual exclusion.
  let landingFrame: BoxFrame;
  if (releasedOnTab) {
    const occupiedFrames = workspace.projection.boxes
      .filter((box) => box.pageId === destinationPageId && box.id !== draggedBoxId)
      .map((box) => box.frame);
    landingFrame = findViewportAdaptiveFrame({
      size: { width: pointerFrame.width, height: pointerFrame.height },
      preferredCenter: getCanvasViewportCenter(pageCanvas.camera, canvas.viewportSize),
      viewportBounds,
      canvasBounds,
      occupiedFrames,
    });
  } else if (isFrameInViewport(pointerFrame, viewportBounds)) {
    landingFrame = constrainBoxFrameToCanvas(pointerFrame, canvasBounds);
  } else {
    landingFrame = findViewportAdaptiveFrame({
      size: { width: pointerFrame.width, height: pointerFrame.height },
      preferredCenter: {
        x: pointerFrame.x + pointerFrame.width / 2,
        y: pointerFrame.y + pointerFrame.height / 2,
      },
      viewportBounds,
      canvasBounds,
    });
  }

  ui.setPendingBoxLanding(draggedBoxId, landingFrame);

  // Projection may already show destination via optimistic preview; Runtime still
  // holds origin until this write. Compare against drag-start page, not projection.
  const persistedPageId = originPageId ?? movingBox.pageId;
  if (persistedPageId !== destinationPageId) {
    // Align local projection before the async write so landing springs from the right page.
    if (movingBox.pageId !== destinationPageId) {
      workspace.previewBoxOnPage(draggedBoxId, destinationPageId, landingFrame);
    }
    void workspace.moveBoxToPage(draggedBoxId, destinationPageId, landingFrame).catch(() => {
      void workspace.revertOptimisticProjection();
    });
    return;
  }

  if (workspace.projection.activePageId !== destinationPageId) {
    workspace.setActivePage(destinationPageId);
  }
  workspace.updateBoxFrame(draggedBoxId, landingFrame);
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
