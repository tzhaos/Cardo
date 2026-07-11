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
