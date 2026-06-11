export interface ViewportCamera {
  panX: number;
  panY: number;
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
  return {
    x: point.clientX - camera.panX,
    y: point.clientY - camera.panY,
  };
}

export function worldToScreen(point: WorldPoint, camera: ViewportCamera): WorldPoint {
  return {
    x: point.x + camera.panX,
    y: point.y + camera.panY,
  };
}

export function addCameraToBounds<T extends WorldPoint>(bounds: T, camera: ViewportCamera): T {
  return {
    ...bounds,
    ...worldToScreen(bounds, camera),
  };
}
