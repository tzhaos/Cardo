import { Toaster } from 'sonner';
import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useVisibleBoxes } from '../../../app/stores/useWorkspaceSelectors';
import Background from '../../../widgets/DesktopShell/Background';
import BrandBadge from '../../../widgets/DesktopShell/BrandBadge';
import ManagedBox from '../../box-management';
import SettingsPanel from '../../settings';
import TrayDock from '../../tray';
import { useWorkspaceGlobalEvents } from '../hooks/useWorkspaceGlobalEvents';
import SnapOverlay from './SnapOverlay';

export default function WorkspaceDesktop() {
  useWorkspaceGlobalEvents();
  const { t } = useI18n();
  const visibleBoxes = useVisibleBoxes();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const theme = usePreferencesStore((state) => state.theme);

  return (
    <div
      className="kb-desktop-root relative h-screen w-full overflow-hidden"
      onPointerDown={() => setActiveBox(null)}
    >
      <Background />
      <BrandBadge label={t('app.brand')} />
      <Toaster theme={theme} position="bottom-right" />
      <SnapOverlay />

      {visibleBoxes.map((box) => (
        <ManagedBox key={box.id} boxId={box.id} />
      ))}

      <TrayDock />
      <SettingsPanel />
    </div>
  );
}
