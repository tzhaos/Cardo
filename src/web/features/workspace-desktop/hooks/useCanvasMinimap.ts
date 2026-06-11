import { useMemo, useState, type MouseEvent } from 'react';
import { getRuntimeViewport } from '../../../app/controllers/runtimeDocumentController';
import { useI18n } from '../../../app/hooks/useI18n';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
import { useVisibleBoxes } from '../../../app/stores/useWorkspaceSelectors';
import { getRenderedBoxBounds } from '../../../../core/domains/workspace/model/workspace';
import type { ViewportCamera } from '../../../../core/domains/layout/model/viewport';
import { useViewportCamera } from './useViewportCamera';

const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MINIMAP_PADDING = 16;

function computeWorldBounds(boxes: ReturnType<typeof useVisibleBoxes>, camera: ViewportCamera) {
  const viewport = getRuntimeViewport();
  const viewportBounds = {
    minX: -camera.panX,
    minY: -camera.panY,
    maxX: -camera.panX + viewport.width,
    maxY: -camera.panY + viewport.height,
  };

  return boxes.reduce(
    (bounds, box) => {
      const rendered = getRenderedBoxBounds(box);
      return {
        minX: Math.min(bounds.minX, rendered.x),
        minY: Math.min(bounds.minY, rendered.y),
        maxX: Math.max(bounds.maxX, rendered.x + rendered.width),
        maxY: Math.max(bounds.maxY, rendered.y + rendered.height),
      };
    },
    viewportBounds,
  );
}

export function useCanvasMinimap() {
  const { t } = useI18n();
  const [isOpen, setOpen] = useState(false);
  const boxes = useVisibleBoxes();
  const camera = useViewportCamera();
  const centerOn = useCanvasStore((state) => state.centerOn);
  const viewport = getRuntimeViewport();
  const worldBounds = computeWorldBounds(boxes, camera);
  const worldWidth = Math.max(1, worldBounds.maxX - worldBounds.minX);
  const worldHeight = Math.max(1, worldBounds.maxY - worldBounds.minY);
  const scale = Math.min(
    (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / worldWidth,
    (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / worldHeight,
  );
  const contentWidth = worldWidth * scale;
  const contentHeight = worldHeight * scale;
  const offsetX = (MINIMAP_WIDTH - contentWidth) / 2;
  const offsetY = (MINIMAP_HEIGHT - contentHeight) / 2;

  const toMinimapRect = (rect: { x: number; y: number; width: number; height: number }) => ({
    x: offsetX + (rect.x - worldBounds.minX) * scale,
    y: offsetY + (rect.y - worldBounds.minY) * scale,
    width: Math.max(2, rect.width * scale),
    height: Math.max(2, rect.height * scale),
  });

  const boxRects = useMemo(
    () =>
      boxes.map((box) => ({
        id: box.id,
        rect: toMinimapRect(getRenderedBoxBounds(box)),
      })),
    [boxes, offsetX, offsetY, scale, worldBounds.minX, worldBounds.minY],
  );

  const viewportRect = toMinimapRect({
    x: -camera.panX,
    y: -camera.panY,
    width: viewport.width,
    height: viewport.height,
  });

  const handleMapClick = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mapX = event.clientX - rect.left;
    const mapY = event.clientY - rect.top;
    const worldX = worldBounds.minX + (mapX - offsetX) / scale;
    const worldY = worldBounds.minY + (mapY - offsetY) / scale;

    centerOn(worldX, worldY, viewport);
  };

  return {
    isOpen,
    width: MINIMAP_WIDTH,
    height: MINIMAP_HEIGHT,
    boxRects,
    viewportRect,
    labels: {
      toggle: isOpen ? t('canvas.hideMinimap') : t('canvas.showMinimap'),
    },
    toggle: () => setOpen((next) => !next),
    handleMapClick,
  };
}

export type CanvasMinimapState = ReturnType<typeof useCanvasMinimap>;
