import { Toaster } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { useThemeStore } from '../../../domains/ui/store/useThemeStore';
import { getVisibleBoxIds } from '../../../domains/workspace/model/workspaceState';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import Background from '../../../widgets/DesktopShell/Background';
import BrandBadge from '../../../widgets/DesktopShell/BrandBadge';
import BoxContainer from '../../../widgets/Box/BoxContainer';
import TrayDock from '../../tray/ui/TrayDock';
import { useWorkspaceGlobalEvents } from '../hooks/useWorkspaceGlobalEvents';
import SnapOverlay from './SnapOverlay';

export default function WorkspaceDesktop() {
  useWorkspaceGlobalEvents();
  const visibleBoxIds = useWorkspaceStore(useShallow((state) => getVisibleBoxIds(state)));
  const setActiveBox = useUIStore((state) => state.setActiveBox);
  const theme = useThemeStore((state) => state.theme);

  return (
    <div
      className="kb-desktop-root relative h-screen w-full overflow-hidden"
      onPointerDown={() => setActiveBox(null)}
    >
      <Background />
      <BrandBadge />
      <Toaster theme={theme} position="top-center" />
      <SnapOverlay />

      {visibleBoxIds.map((boxId) => (
        <BoxContainer key={boxId} boxId={boxId} />
      ))}

      <TrayDock />
    </div>
  );
}
