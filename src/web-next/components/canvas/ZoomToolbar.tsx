import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM } from '../../domain/canvasGeometry';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../primitives/IconPrimitives';

const ZOOM_STEP = 0.1;

export function ZoomToolbar() {
  const activePageId = useWorkspaceStore((state) => state.snapshot.activePageId);
  const enabled = usePreferencesStore((state) => state.canvasZoomEnabled);
  const zoom = useCanvasStore((state) => state.pages[activePageId]?.camera.zoom ?? 1);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const { t } = useI18n();

  if (!enabled) return null;

  const updateZoom = (nextZoom: number) => setZoom(activePageId, nextZoom, undefined, true);

  return (
    <div className="wbn-zoom-toolbar" aria-label={t('canvas.zoomControls')}>
      <IconButton
        disabled={zoom <= MIN_CANVAS_ZOOM}
        onClick={() => updateZoom(zoom - ZOOM_STEP)}
        aria-label={t('canvas.zoomOut')}
        title={t('canvas.zoomOut')}
      >
        <Minus size={16} />
      </IconButton>
      <output className="wbn-zoom-value">{Math.round(zoom * 100)}%</output>
      <IconButton
        disabled={zoom >= MAX_CANVAS_ZOOM}
        onClick={() => updateZoom(zoom + ZOOM_STEP)}
        aria-label={t('canvas.zoomIn')}
        title={t('canvas.zoomIn')}
      >
        <Plus size={16} />
      </IconButton>
      <span className="wbn-zoom-divider" />
      <IconButton
        disabled={Math.abs(zoom - 1) < 0.001}
        onClick={() => updateZoom(1)}
        aria-label={t('canvas.resetZoom')}
        title={t('canvas.resetZoom')}
      >
        <RotateCcw size={15} />
      </IconButton>
    </div>
  );
}
