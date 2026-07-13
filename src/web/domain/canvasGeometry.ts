import {
  screenToWorld,
  type ViewportCamera,
  type WorldPoint,
} from '../../core/domains/layout/model/viewport';
import type { BoxFrame } from './workspace';

export interface CanvasViewportSize {
  width: number;
  height: number;
}

export type CanvasCamera = ViewportCamera;
export type CanvasPoint = WorldPoint;

export interface CanvasClientPoint {
  clientX: number;
  clientY: number;
}

export interface CanvasClientBounds {
  left: number;
  top: number;
}

export interface CanvasWorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface CanvasPanLimits {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const CANVAS_EXTRA_SCREEN_SPAN = 1.2;
export const CANVAS_SCREEN_SPAN = 1 + CANVAS_EXTRA_SCREEN_SPAN;
const CANVAS_EDGE_SCREEN_SPAN = CANVAS_EXTRA_SCREEN_SPAN / 2;
export const ORIGIN_CANVAS_CAMERA: CanvasCamera = { panX: 0, panY: 0, zoom: 1 };

export function createCanvasWorldBounds(viewport: CanvasViewportSize): CanvasWorldBounds {
  const width = normalizeDimension(viewport.width);
  const height = normalizeDimension(viewport.height);
  const horizontalMargin = width * CANVAS_EDGE_SCREEN_SPAN;
  const verticalMargin = height * CANVAS_EDGE_SCREEN_SPAN;

  return {
    minX: -horizontalMargin,
    minY: -verticalMargin,
    maxX: width + horizontalMargin,
    maxY: height + verticalMargin,
    width: width + horizontalMargin * 2,
    height: height + verticalMargin * 2,
  };
}

export function getCanvasPanLimits(viewport: CanvasViewportSize): CanvasPanLimits {
  const width = normalizeDimension(viewport.width);
  const height = normalizeDimension(viewport.height);
  const horizontalLimit = width * CANVAS_EDGE_SCREEN_SPAN;
  const verticalLimit = height * CANVAS_EDGE_SCREEN_SPAN;

  return {
    minX: -horizontalLimit,
    maxX: horizontalLimit,
    minY: -verticalLimit,
    maxY: verticalLimit,
  };
}

export function panCanvasCamera(
  camera: CanvasCamera,
  delta: CanvasPoint,
  viewport: CanvasViewportSize,
): CanvasCamera {
  return constrainCanvasCamera(
    { ...camera, panX: camera.panX + delta.x, panY: camera.panY + delta.y },
    viewport,
  );
}

export function constrainCanvasCamera(
  camera: CanvasCamera,
  viewport: CanvasViewportSize,
): CanvasCamera {
  const width = normalizeDimension(viewport.width);
  const height = normalizeDimension(viewport.height);

  if (width === 0 || height === 0) {
    return camera;
  }

  const limits = getCanvasPanLimits(viewport);
  return {
    panX: clamp(camera.panX, limits.minX, limits.maxX),
    panY: clamp(camera.panY, limits.minY, limits.maxY),
    zoom: 1,
  };
}

export function getVisibleCanvasWorldBounds(camera: CanvasCamera, viewport: CanvasViewportSize) {
  const topLeft = screenToWorld({ clientX: 0, clientY: 0 }, camera);
  const bottomRight = screenToWorld({ clientX: viewport.width, clientY: viewport.height }, camera);
  return {
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

export function clientPointToCanvasWorld(
  point: CanvasClientPoint,
  clientBounds: CanvasClientBounds,
  camera: CanvasCamera,
): CanvasPoint {
  return screenToWorld(
    {
      clientX: point.clientX - clientBounds.left,
      clientY: point.clientY - clientBounds.top,
    },
    camera,
  );
}

export function getCanvasViewportCenter(
  camera: CanvasCamera,
  viewport: CanvasViewportSize,
): CanvasPoint {
  return screenToWorld({ clientX: viewport.width / 2, clientY: viewport.height / 2 }, camera);
}

export function constrainBoxFrameToCanvas(frame: BoxFrame, bounds: CanvasWorldBounds): BoxFrame {
  if (bounds.width === 0 || bounds.height === 0) {
    return frame;
  }

  const width = Math.min(frame.width, bounds.width);
  const height = Math.min(frame.height, bounds.height);

  return {
    x: clamp(frame.x, bounds.minX, bounds.maxX - width),
    y: clamp(frame.y, bounds.minY, bounds.maxY - height),
    width,
    height,
  };
}

export function constrainBoxResizeToCanvas(
  frame: BoxFrame,
  bounds: CanvasWorldBounds,
  minimumSize: { width: number; height: number },
): BoxFrame {
  if (bounds.width === 0 || bounds.height === 0) {
    return frame;
  }

  const x = clamp(frame.x, bounds.minX, bounds.maxX);
  const y = clamp(frame.y, bounds.minY, bounds.maxY);
  const availableWidth = Math.max(0, bounds.maxX - x);
  const availableHeight = Math.max(0, bounds.maxY - y);

  return {
    x,
    y,
    width: clamp(frame.width, Math.min(minimumSize.width, availableWidth), availableWidth),
    height: clamp(frame.height, Math.min(minimumSize.height, availableHeight), availableHeight),
  };
}

function normalizeDimension(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
