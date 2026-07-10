import { LocateFixed, Lock, Unlock } from 'lucide-react';
import { motion } from 'motion/react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../primitives/IconPrimitives';

export function CanvasControls({ pageId }: { pageId: string }) {
  const panX = useCanvasStore((state) => state.pages[pageId]?.camera.panX ?? 0);
  const panY = useCanvasStore((state) => state.pages[pageId]?.camera.panY ?? 0);
  const isLocked = useCanvasStore((state) => state.pages[pageId]?.isLocked ?? false);
  const resetCamera = useCanvasStore((state) => state.resetCamera);
  const toggleLocked = useCanvasStore((state) => state.toggleLocked);
  const { t } = useI18n();
  const isAtOrigin = panX === 0 && panY === 0;

  return (
    <div className="wbn-canvas-controls" data-canvas-controls>
      <IconButton
        disabled={isAtOrigin}
        onClick={() => resetCamera(pageId)}
        aria-label={t('canvas.returnToOrigin')}
        title={t('canvas.returnToOrigin')}
      >
        <LocateFixed size={18} />
      </IconButton>
      <IconButton
        className={isLocked ? 'wbn-canvas-control-active' : undefined}
        onClick={() => toggleLocked(pageId)}
        aria-label={t(isLocked ? 'canvas.unlockViewport' : 'canvas.lockViewport')}
        aria-pressed={isLocked}
        title={t(isLocked ? 'canvas.unlockViewport' : 'canvas.lockViewport')}
      >
        <motion.span
          className="wbn-icon-frame"
          key={isLocked ? 'locked' : 'unlocked'}
          initial={{ opacity: 0, scale: 0.72, rotate: isLocked ? -18 : 18 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.5 }}
        >
          {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
        </motion.span>
      </IconButton>
    </div>
  );
}
