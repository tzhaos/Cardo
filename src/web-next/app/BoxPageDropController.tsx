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
import { findViewportAdaptiveFrame, isFrameFreeInViewport } from '../domain/placement';
import type { BoxFrame } from '../domain/workspace';
import { isCollectionPageId, isRecycleBinPageId } from '../domain/workspace';

export function BoxPageDropController() {
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const transferGenerationRef = useRef(0);
  const activeTransferPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!draggedBoxId) {
      transferGenerationRef.current = 0;
      activeTransferPageIdRef.current = null;
      return;
    }

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

    const previewPageUnderPointer = (clientX: number, clientY: number, pageId: string | null) => {
      if (!pageId || isCollectionPageId(pageId)) return;

      const workspace = useWorkspaceStore.getState();
      const movingBox = workspace.projection.boxes.find((box) => box.id === draggedBoxId);
      if (!movingBox) return;

      if (movingBox.pageId === pageId) {
        if (workspace.projection.activePageId !== pageId) {
          workspace.setActivePage(pageId);
        }
        return;
      }

      if (activeTransferPageIdRef.current === pageId) return;
      activeTransferPageIdRef.current = pageId;

      const dragSession = useUiStore.getState().boxDragSession;
      const sizeSource = dragSession?.latestFrame ?? movingBox.frame;
      const transformOrigin = dragSession?.transformOrigin ?? '50% 50%';
      // Keep the grab point under the cursor across page cameras so the compact
      // floating box does not jump when the destination page mounts.
      const nextFrame = framePreservingGrabUnderPointer(
        clientX,
        clientY,
        pageId,
        sizeSource,
        transformOrigin,
      );
      if (!nextFrame) return;

      // Rebase before the async write so remounted frames read stable coordinates.
      useUiStore.getState().rebaseBoxDragSession(nextFrame, clientX, clientY);

      const generation = ++transferGenerationRef.current;
      void workspace.moveBoxToPage(draggedBoxId, pageId, nextFrame).catch(() => {
        if (generation === transferGenerationRef.current) {
          activeTransferPageIdRef.current = null;
        }
      });
    };

    const updateDropTarget = ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      const overTopBar = resolveTopBarHover(clientX, clientY);
      const pageId = overTopBar ? findPageDropAtPoint(clientX, clientY) : null;
      ui.setBoxDragOverTopBar(overTopBar);
      ui.setBoxDropPage(pageId);
      if (overTopBar) {
        previewPageUnderPointer(clientX, clientY, pageId);
      } else {
        activeTransferPageIdRef.current = null;
      }
    };

    const frameScheduler = createLatestFrameScheduler(updateDropTarget);
    const session = startWindowPointerSession({
      onMove: (event) =>
        frameScheduler.schedule({ clientX: event.clientX, clientY: event.clientY }),
      onEnd: (reason, event) => {
        if (reason === 'pointerup' && event instanceof PointerEvent) {
          commitBoxDragRelease(draggedBoxId, event);
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

function commitBoxDragRelease(draggedBoxId: string, event: PointerEvent) {
  const ui = useUiStore.getState();
  const workspace = useWorkspaceStore.getState();
  const movingBox = workspace.projection.boxes.find((box) => box.id === draggedBoxId);
  const dragSession = ui.boxDragSession;
  if (!movingBox || !dragSession) return;

  const tabPageId = findPageDropAtPoint(event.clientX, event.clientY) ?? ui.boxDropPageId;

  if (tabPageId && isCollectionPageId(tabPageId)) {
    if (isRecycleBinPageId(movingBox.pageId)) return;
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
  const occupiedFrames = workspace.projection.boxes
    .filter((box) => box.pageId === destinationPageId && box.id !== draggedBoxId)
    .map((box) => box.frame);

  const pointerFrame =
    framePreservingGrabUnderPointer(
      event.clientX,
      event.clientY,
      destinationPageId,
      dragSession.latestFrame,
      dragSession.transformOrigin,
    ) ?? dragSession.latestFrame;

  const releasedOnTab = Boolean(tabPageId) && ui.boxDragOverTopBar;
  const preferredCenter = releasedOnTab
    ? getCanvasViewportCenter(pageCanvas.camera, canvas.viewportSize)
    : {
        x: pointerFrame.x + pointerFrame.width / 2,
        y: pointerFrame.y + pointerFrame.height / 2,
      };

  // Keep the free pointer drop when it already sits cleanly in the viewport.
  // Otherwise (tab release, crowded, off-screen) adapt into the visible area.
  const landingFrame =
    !releasedOnTab && isFrameFreeInViewport(pointerFrame, viewportBounds, occupiedFrames)
      ? constrainBoxFrameToCanvas(pointerFrame, canvasBounds)
      : findViewportAdaptiveFrame({
          size: { width: pointerFrame.width, height: pointerFrame.height },
          preferredCenter,
          viewportBounds,
          canvasBounds,
          occupiedFrames,
        });

  ui.setPendingBoxLanding(draggedBoxId, landingFrame);

  if (movingBox.pageId !== destinationPageId) {
    void workspace.moveBoxToPage(draggedBoxId, destinationPageId, landingFrame);
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
