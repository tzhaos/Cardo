import { useEffect, useRef } from 'react';
import { createLatestFrameScheduler } from './motion/frameScheduler';
import { getPageCanvasState, useCanvasStore } from './stores/canvasStore';
import { useUiStore } from './stores/uiStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { startWindowPointerSession } from './windowPointerSession';
import {
  findPageDropAtPoint,
  getBoxElement,
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
import { findPageLandingFrame } from '../domain/placement';
import { isCollectionPageId, isRecycleBinPageId } from '../domain/workspace';

export function BoxPageDropController() {
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const boxDropRelease = useUiStore((state) => state.boxDropRelease);
  const clearBoxDropRelease = useUiStore((state) => state.clearBoxDropRelease);
  const transferGenerationRef = useRef(0);
  const activeTransferPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!boxDropRelease) return;
    const timeoutId = window.setTimeout(clearBoxDropRelease, 1400);
    return () => window.clearTimeout(timeoutId);
  }, [boxDropRelease, clearBoxDropRelease]);

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

      const canvas = useCanvasStore.getState();
      const canvasRect = getCanvasElement()?.getBoundingClientRect();
      if (!canvasRect) return;

      const targetPageCanvas = getPageCanvasState(canvas, pageId);
      const pointerWorld = clientPointToCanvasWorld(
        { clientX, clientY },
        canvasRect,
        targetPageCanvas.camera,
      );
      const dragSession = useUiStore.getState().boxDragSession;
      const frameSource = dragSession?.latestFrame ?? movingBox.frame;
      const nextFrame = constrainBoxFrameToCanvas(
        {
          ...frameSource,
          x: Math.round(pointerWorld.x - frameSource.width / 2),
          y: Math.round(pointerWorld.y - frameSource.height / 2),
        },
        createCanvasWorldBounds(canvas.viewportSize),
      );

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
          finishDrop(draggedBoxId, event);
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

function finishDrop(draggedBoxId: string, event: PointerEvent) {
  const currentProjection = useWorkspaceStore.getState().projection;
  const targetPageId =
    findPageDropAtPoint(event.clientX, event.clientY) ?? useUiStore.getState().boxDropPageId;
  const movingBox = currentProjection.boxes.find((box) => box.id === draggedBoxId);
  if (!targetPageId || !movingBox) return;

  const ui = useUiStore.getState();
  const workspace = useWorkspaceStore.getState();
  const dragSession = ui.boxDragSession;
  const releaseFrame = dragSession?.latestFrame ?? movingBox.frame;

  if (isCollectionPageId(targetPageId)) {
    if (isRecycleBinPageId(movingBox.pageId)) return;
    ui.finishBoxDrop(
      draggedBoxId,
      targetPageId,
      releaseFrame,
      1,
      `${releaseFrame.width / 2}px ${releaseFrame.height / 2}px`,
    );
    workspace.addBoxToCollection(draggedBoxId);
    ui.selectBox(null);
    workspace.setActivePage(targetPageId);
    return;
  }

  // Hover transfer already moved the box and switched pages.
  if (movingBox.pageId === targetPageId) {
    if (currentProjection.activePageId !== targetPageId) {
      workspace.setActivePage(targetPageId);
    }
    // Releasing on a tab should land in free space, not under the chrome.
    if (ui.boxDragOverTopBar) {
      const canvasState = useCanvasStore.getState();
      const targetPageCanvas = getPageCanvasState(canvasState, targetPageId);
      const visibleBounds = getVisibleCanvasWorldBounds(
        targetPageCanvas.camera,
        canvasState.viewportSize,
      );
      const landingFrame = findPageLandingFrame(
        currentProjection,
        draggedBoxId,
        targetPageId,
        getCanvasViewportCenter(targetPageCanvas.camera, canvasState.viewportSize),
        visibleBounds,
      );
      workspace.updateBoxFrame(draggedBoxId, landingFrame ?? releaseFrame);
    }
    return;
  }

  const canvasState = useCanvasStore.getState();
  const targetPageCanvas = getPageCanvasState(canvasState, targetPageId);
  const visibleBounds = getVisibleCanvasWorldBounds(
    targetPageCanvas.camera,
    canvasState.viewportSize,
  );
  const landingFrame = findPageLandingFrame(
    currentProjection,
    draggedBoxId,
    targetPageId,
    getCanvasViewportCenter(targetPageCanvas.camera, canvasState.viewportSize),
    visibleBounds,
  );
  const targetFrame = landingFrame ?? releaseFrame;
  const compactScale = Math.max(
    0.22,
    Math.min(0.46, 136 / releaseFrame.width, 86 / releaseFrame.height),
  );
  const entryScale = compactScale * 0.9;
  const releaseElement = getBoxElement(draggedBoxId);
  const releaseRect = releaseElement?.getBoundingClientRect();
  const computedOrigin = releaseElement
    ? window.getComputedStyle(releaseElement).transformOrigin
    : `${releaseFrame.width / 2}px ${releaseFrame.height / 2}px`;
  const [originX = releaseFrame.width / 2, originY = releaseFrame.height / 2] = computedOrigin
    .split(' ')
    .map((value) => Number.parseFloat(value));
  const canvasRect = getCanvasElement()?.getBoundingClientRect() ?? { left: 0, top: 0 };
  const releaseTopLeft = releaseRect
    ? clientPointToCanvasWorld(
        { clientX: releaseRect.left, clientY: releaseRect.top },
        canvasRect,
        targetPageCanvas.camera,
      )
    : {
        x: visibleBounds.minX + visibleBounds.width / 2,
        y: visibleBounds.minY,
      };
  const entryFrame = {
    ...targetFrame,
    x: releaseTopLeft.x - originX * (1 - entryScale),
    y: releaseTopLeft.y - originY * (1 - entryScale),
  };
  ui.finishBoxDrop(draggedBoxId, targetPageId, entryFrame, entryScale, computedOrigin);
  void workspace.moveBoxToPage(draggedBoxId, targetPageId, targetFrame);
}
