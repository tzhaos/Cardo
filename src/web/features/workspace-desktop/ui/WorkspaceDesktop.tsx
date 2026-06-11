import { AnimatePresence } from 'motion/react';
import { ToastViewport } from '../../../app/presentation/ToastViewport';
import Background from '../../../widgets/DesktopShell/Background';
import BrandBadge from '../../../widgets/DesktopShell/BrandBadge';
import ManagedBox from '../../box-management';
import SettingsPanel from '../../settings';
import TrayDock from '../../tray';
import { useWorkspaceGlobalEvents } from '../hooks/useWorkspaceGlobalEvents';
import { useWorkspaceDesktopState } from '../hooks/useWorkspaceDesktopState';
import { useCanvasPan } from '../hooks/useCanvasPan';
import { useCanvasMinimap } from '../hooks/useCanvasMinimap';
import CanvasControls from './CanvasControls';
import CanvasMinimap from './CanvasMinimap';
import SnapOverlay from './SnapOverlay';

export default function WorkspaceDesktop() {
  useWorkspaceGlobalEvents();
  const {
    brandLabel,
    camera,
    clearActiveBox,
    isPanModifierActive,
    isViewportLocked,
    interactionMode,
    theme,
    visibleBoxIds,
  } = useWorkspaceDesktopState();
  const { handleCanvasPointerDown } = useCanvasPan();
  const minimap = useCanvasMinimap();

  return (
    <div
      className={`kb-desktop-root relative h-screen w-full overflow-hidden ${
        isViewportLocked
          ? 'cursor-default'
          : interactionMode === 'panning' || isPanModifierActive
            ? 'cursor-grabbing'
            : 'cursor-grab'
      }`}
      onPointerDown={(event) => {
        if (event.currentTarget === event.target) {
          clearActiveBox();
        }
        handleCanvasPointerDown(event);
      }}
    >
      <Background camera={camera} />
      <BrandBadge label={brandLabel} />
      <ToastViewport theme={theme} />
      <SnapOverlay />

      <AnimatePresence initial={false}>
        {visibleBoxIds.map((boxId) => (
          <ManagedBox key={boxId} boxId={boxId} />
        ))}
      </AnimatePresence>

      <CanvasControls
        isMinimapOpen={minimap.isOpen}
        minimapLabel={minimap.labels.toggle}
        onToggleMinimap={minimap.toggle}
      />
      <CanvasMinimap minimap={minimap} />
      <TrayDock />
      <SettingsPanel />
    </div>
  );
}
