import { createDefaultBoxFrameCenteredAt } from '../../core/domains/layout/boxDefaults';
import {
  constrainBoxFrameToCanvas,
  type CanvasPoint,
  type CanvasWorldBounds,
} from './canvasGeometry';
import type { BoxFrame, WorkspaceProjection } from './workspace';

const VIEWPORT_MARGIN = 16;

export function createBoxFrameCenteredAt(point: CanvasPoint): BoxFrame {
  return createDefaultBoxFrameCenteredAt(point);
}

/** New box at preferred center — boxes may overlap; only canvas bounds apply. */
export function findNewBoxFrame(
  _projection: WorkspaceProjection,
  _pageId: string,
  preferredCenter: CanvasPoint,
  bounds: CanvasWorldBounds,
) {
  return constrainBoxFrameToCanvas(createBoxFrameCenteredAt(preferredCenter), bounds);
}

export function findPageLandingFrame(
  projection: WorkspaceProjection,
  boxId: string,
  _pageId: string,
  preferredCenter: CanvasPoint,
  bounds: CanvasWorldBounds,
): BoxFrame | null {
  const movingBox = projection.boxes.find((box) => box.id === boxId);
  if (!movingBox) {
    return null;
  }

  return findViewportAdaptiveFrame({
    size: { width: movingBox.frame.width, height: movingBox.frame.height },
    preferredCenter,
    viewportBounds: bounds,
    canvasBounds: bounds,
  });
}

/**
 * Place a box centered on preferredCenter inside the visible viewport.
 * Overlap with other boxes is allowed (no mutual exclusion).
 */
export function findViewportAdaptiveFrame({
  size,
  preferredCenter,
  viewportBounds,
  canvasBounds,
}: {
  size: { width: number; height: number };
  preferredCenter: CanvasPoint;
  viewportBounds: CanvasWorldBounds;
  canvasBounds: CanvasWorldBounds;
}): BoxFrame {
  const placementBounds = intersectBounds(viewportBounds, canvasBounds, VIEWPORT_MARGIN);
  return constrainBoxFrameToCanvas(
    {
      x: Math.round(preferredCenter.x - size.width / 2),
      y: Math.round(preferredCenter.y - size.height / 2),
      width: size.width,
      height: size.height,
    },
    placementBounds,
  );
}

/** True when the frame fully sits inside the padded viewport (overlap ignored). */
export function isFrameInViewport(frame: BoxFrame, viewportBounds: CanvasWorldBounds) {
  const padded = insetBounds(viewportBounds, VIEWPORT_MARGIN);
  return frameContainedBy(frame, padded);
}

function frameContainedBy(frame: BoxFrame, bounds: CanvasWorldBounds) {
  return (
    frame.x >= bounds.minX &&
    frame.y >= bounds.minY &&
    frame.x + frame.width <= bounds.maxX &&
    frame.y + frame.height <= bounds.maxY
  );
}

function insetBounds(bounds: CanvasWorldBounds, margin: number): CanvasWorldBounds {
  const minX = bounds.minX + margin;
  const minY = bounds.minY + margin;
  const maxX = bounds.maxX - margin;
  const maxY = bounds.maxY - margin;
  return {
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

function intersectBounds(
  first: CanvasWorldBounds,
  second: CanvasWorldBounds,
  margin = 0,
): CanvasWorldBounds {
  const minX = Math.max(first.minX, second.minX) + margin;
  const minY = Math.max(first.minY, second.minY) + margin;
  const maxX = Math.min(first.maxX, second.maxX) - margin;
  const maxY = Math.min(first.maxY, second.maxY) - margin;
  return {
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}
