import { useEffect } from 'react';
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
  getCanvasViewportCenter,
  getVisibleCanvasWorldBounds,
} from '../domain/canvasGeometry';
import { findPageLandingFrame } from '../domain/placement';
import { isCollectionPageId, isRecycleBinPageId } from '../domain/workspace';

export function BoxPageDropController() {
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const boxDropRelease = useUiStore((state) => state.boxDropRelease);
  const clearBoxDropRelease = useUiStore((state) => state.clearBoxDropRelease);

  useEffect(() => {
    if (!boxDropRelease) return;
    const timeoutId = window.setTimeout(clearBoxDropRelease, 1400);
    return () => window.clearTimeout(timeoutId);
  }, [boxDropRelease, clearBoxDropRelease]);

  useEffect(() => {
    if (!draggedBoxId) return;

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
    const updateDropTarget = ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      const overTopBar = resolveTopBarHover(clientX, clientY);
      ui.setBoxDragOverTopBar(overTopBar);
      ui.setBoxDropPage(overTopBar ? findPageDropAtPoint(clientX, clientY) : null);
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
  if (!targetPageId || !movingBox || movingBox.pageId === targetPageId) return;

  const ui = useUiStore.getState();
  const workspace = useWorkspaceStore.getState();
  if (isCollectionPageId(targetPageId)) {
    if (isRecycleBinPageId(movingBox.pageId)) return;
    ui.finishBoxDrop(
      draggedBoxId,
      targetPageId,
      movingBox.frame,
      1,
      `${movingBox.frame.width / 2}px ${movingBox.frame.height / 2}px`,
    );
    workspace.addBoxToCollection(draggedBoxId);
    ui.selectBox(null);
    workspace.setActivePage(targetPageId);
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
  const targetFrame = landingFrame ?? movingBox.frame;
  const compactScale = Math.max(
    0.22,
    Math.min(0.46, 136 / movingBox.frame.width, 86 / movingBox.frame.height),
  );
  const entryScale = compactScale * 0.9;
  const releaseElement = getBoxElement(draggedBoxId);
  const releaseRect = releaseElement?.getBoundingClientRect();
  const computedOrigin = releaseElement
    ? window.getComputedStyle(releaseElement).transformOrigin
    : `${movingBox.frame.width / 2}px ${movingBox.frame.height / 2}px`;
  const [originX = movingBox.frame.width / 2, originY = movingBox.frame.height / 2] = computedOrigin
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
  workspace.moveBoxToPage(draggedBoxId, targetPageId, targetFrame);
}
