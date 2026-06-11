import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useVisibleBoxes } from '../../../app/stores/useWorkspaceSelectors';
import { useViewportCamera } from './useViewportCamera';

export function useWorkspaceDesktopState() {
  const { t } = useI18n();
  const visibleBoxes = useVisibleBoxes();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const camera = useViewportCamera();
  const isViewportLocked = useCanvasStore((state) => state.isLocked);
  const interactionMode = useCanvasStore((state) => state.interactionMode);
  const isPanModifierActive = useCanvasStore((state) => state.isPanModifierActive);
  const theme = usePreferencesStore((state) => state.theme);

  return {
    brandLabel: t('app.brand'),
    camera,
    isViewportLocked,
    interactionMode,
    isPanModifierActive,
    theme,
    visibleBoxIds: visibleBoxes.map((box) => box.id),
    clearActiveBox: () => setActiveBox(null),
  };
}
