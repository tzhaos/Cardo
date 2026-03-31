import { Toaster } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
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

  return (
    <div
      className="relative h-screen w-full overflow-hidden bg-neutral-950"
      onPointerDown={() => setActiveBox(null)}
    >
      <Background />
      <BrandBadge />
      <Toaster theme="dark" position="top-center" />
      <SnapOverlay />

      {visibleBoxIds.map((boxId) => (
        <BoxContainer key={boxId} boxId={boxId} />
      ))}

      <TrayDock />
    </div>
  );
}
