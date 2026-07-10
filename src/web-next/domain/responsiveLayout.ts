import type { BoxFrame, WorkspaceSnapshot, WorkspaceViewport } from './workspace';

const MIN_BOX_WIDTH = 240;
const MIN_BOX_HEIGHT = 170;
const VIEWPORT_PADDING = 8;

export function adaptWorkspaceToViewport(
  snapshot: WorkspaceSnapshot,
  layoutViewport: WorkspaceViewport,
) {
  const nextViewport = normalizeViewport(layoutViewport);
  if (!nextViewport) {
    return snapshot;
  }

  const previousViewport = snapshot.layoutViewport;
  if (!previousViewport) {
    return { ...snapshot, layoutViewport: nextViewport };
  }
  if (
    previousViewport.width === nextViewport.width &&
    previousViewport.height === nextViewport.height
  ) {
    return snapshot;
  }

  const horizontalScale = nextViewport.width / previousViewport.width;
  const verticalScale = nextViewport.height / previousViewport.height;
  const sizeScale = Math.min(horizontalScale, verticalScale);

  return {
    ...snapshot,
    layoutViewport: nextViewport,
    boxes: snapshot.boxes.map((box) => ({
      ...box,
      frame: adaptFrame(box.frame, nextViewport, horizontalScale, verticalScale, sizeScale),
    })),
  };
}

function adaptFrame(
  frame: BoxFrame,
  viewport: WorkspaceViewport,
  horizontalScale: number,
  verticalScale: number,
  sizeScale: number,
): BoxFrame {
  const maxWidth = Math.max(MIN_BOX_WIDTH, viewport.width - VIEWPORT_PADDING * 2);
  const maxHeight = Math.max(MIN_BOX_HEIGHT, viewport.height - VIEWPORT_PADDING * 2);
  const width = clamp(Math.round(frame.width * sizeScale), MIN_BOX_WIDTH, maxWidth);
  const height = clamp(Math.round(frame.height * sizeScale), MIN_BOX_HEIGHT, maxHeight);

  return {
    x: clamp(
      Math.round(frame.x * horizontalScale),
      VIEWPORT_PADDING,
      viewport.width - width - VIEWPORT_PADDING,
    ),
    y: clamp(
      Math.round(frame.y * verticalScale),
      VIEWPORT_PADDING,
      viewport.height - height - VIEWPORT_PADDING,
    ),
    width,
    height,
  };
}

function normalizeViewport(viewport: WorkspaceViewport): WorkspaceViewport | null {
  const width = Math.round(viewport.width);
  const height = Math.round(viewport.height);
  return width > 0 && height > 0 ? { width, height } : null;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
