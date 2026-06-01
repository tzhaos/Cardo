import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useVisibleBoxes } from '../../../app/stores/useWorkspaceSelectors';

export function useWorkspaceDesktopState() {
  const { t } = useI18n();
  const visibleBoxes = useVisibleBoxes();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const theme = usePreferencesStore((state) => state.theme);

  return {
    brandLabel: t('app.brand'),
    theme,
    visibleBoxIds: visibleBoxes.map((box) => box.id),
    clearActiveBox: () => setActiveBox(null),
  };
}
