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
} from '../domain/canvasGeometry';
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
      const frameSource = dragSession?.latestFrame ?? movingBox.frame;
      const nextFrame = frameUnderPointer(clientX, clientY, pageId, frameSource);
      if (!nextFrame) return;

      const generation = ++transferGenerationRef.current;
      void workspace
        .moveBoxToPage(draggedBoxId, pageId, nextFrame)
        .then(() => {
          if (generation !== transferGenerationRef.current) return;
          if (useUiStore.getState().draggedBoxId !== draggedBoxId) return;
          useUiStore.getState().rebaseBoxDragSession(nextFrame, clientX, clientY);
        })
        .catch(() => {
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

/**
 * Single write path for box-drag completion: always place at the pointer's
 * world position on the destination page. No center landing, no scale-from-origin.
 */
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

  // Prefer the live drag frame (mouse-followed top-left). Only reproject when the
  // destination page is not yet the box's page (hover transfer still in flight).
  const releaseFrame =
    movingBox.pageId === destinationPageId
      ? dragSession.latestFrame
      : (frameUnderPointer(
          event.clientX,
          event.clientY,
          destinationPageId,
          dragSession.latestFrame,
        ) ?? dragSession.latestFrame);

  if (movingBox.pageId !== destinationPageId) {
    void workspace.moveBoxToPage(draggedBoxId, destinationPageId, releaseFrame);
    return;
  }

  if (workspace.projection.activePageId !== destinationPageId) {
    workspace.setActivePage(destinationPageId);
  }
  workspace.updateBoxFrame(draggedBoxId, releaseFrame);
}

function frameUnderPointer(
  clientX: number,
  clientY: number,
  pageId: string,
  sizeSource: BoxFrame,
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

  return constrainBoxFrameToCanvas(
    {
      ...sizeSource,
      x: Math.round(pointerWorld.x - sizeSource.width / 2),
      y: Math.round(pointerWorld.y - sizeSource.height / 2),
    },
    createCanvasWorldBounds(canvas.viewportSize),
  );
}
