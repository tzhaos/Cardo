import { AnimatePresence } from 'motion/react';
import { ToastViewport } from '../../../app/presentation/ToastViewport';
import Background from '../../../widgets/DesktopShell/Background';
import BrandBadge from '../../../widgets/DesktopShell/BrandBadge';
import ManagedBox from '../../box-management';
import SettingsPanel from '../../settings';
import TrayDock from '../../tray';
import { useWorkspaceGlobalEvents } from '../hooks/useWorkspaceGlobalEvents';
import { useWorkspaceDesktopState } from '../hooks/useWorkspaceDesktopState';
import SnapOverlay from './SnapOverlay';

export default function WorkspaceDesktop() {
  useWorkspaceGlobalEvents();
  const { brandLabel, clearActiveBox, theme, visibleBoxIds } = useWorkspaceDesktopState();

  return (
    <div
      className="kb-desktop-root relative h-screen w-full overflow-hidden"
      onPointerDown={clearActiveBox}
    >
      <Background />
      <BrandBadge label={brandLabel} />
      <ToastViewport theme={theme} />
      <SnapOverlay />

      <AnimatePresence initial={false}>
        {visibleBoxIds.map((boxId) => (
          <ManagedBox key={boxId} boxId={boxId} />
        ))}
      </AnimatePresence>

      <TrayDock />
      <SettingsPanel />
    </div>
  );
}
