export interface ViewportCamera {
  panX: number;
  panY: number;
  zoom?: number;
}

export interface ScreenPoint {
  clientX: number;
  clientY: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

export function screenToWorld(point: ScreenPoint, camera: ViewportCamera): WorldPoint {
  const zoom = camera.zoom ?? 1;
  return {
    x: (point.clientX - camera.panX) / zoom,
    y: (point.clientY - camera.panY) / zoom,
  };
}

export function worldToScreen(point: WorldPoint, camera: ViewportCamera): WorldPoint {
  const zoom = camera.zoom ?? 1;
  return {
    x: point.x * zoom + camera.panX,
    y: point.y * zoom + camera.panY,
  };
}

export function addCameraToBounds<T extends WorldPoint>(bounds: T, camera: ViewportCamera): T {
  return {
    ...bounds,
    ...worldToScreen(bounds, camera),
  };
}
