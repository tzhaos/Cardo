import { useI18n } from '../../../app/hooks/useI18n';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';

export function useCanvasControls() {
  const { t } = useI18n();
  const isLocked = useCanvasStore((state) => state.isLocked);
  const resetPan = useCanvasStore((state) => state.resetPan);
  const setLocked = useCanvasStore((state) => state.setLocked);

  return {
    isLocked,
    resetViewportLabel: t('canvas.resetViewport'),
    lockViewportLabel: isLocked ? t('canvas.unlockViewport') : t('canvas.lockViewport'),
    resetViewport: resetPan,
    toggleViewportLock: () => setLocked(!isLocked),
  };
}
