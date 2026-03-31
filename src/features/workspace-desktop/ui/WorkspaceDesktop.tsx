import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { isUrlText } from '../../../domains/items/services/isUrlText';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import { isEditableElement } from '../../../lib/dom';
import Background from '../../../widgets/DesktopShell/Background';
import BrandBadge from '../../../widgets/DesktopShell/BrandBadge';
import BoxContainer from '../../../widgets/Box/BoxContainer';
import TrayDock from '../../tray/ui/TrayDock';
import SnapOverlay from './SnapOverlay';

export default function WorkspaceDesktop() {
  const boxes = useWorkspaceStore((state) => state.boxes);
  const toggleAllMinimized = useWorkspaceStore((state) => state.toggleAllMinimized);
  const addPastedItem = useWorkspaceStore((state) => state.addPastedItem);
  const setActiveBox = useUIStore((state) => state.setActiveBox);
  const editingSessionId = useUIStore((state) => state.editingSessionId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || editingSessionId || isEditableElement(event.target)) {
        return;
      }

      if (event.ctrlKey && event.key === '`') {
        const areBoxesMinimized = toggleAllMinimized();
        toast(areBoxesMinimized ? 'Hiding all boxes' : 'Showing all boxes');
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || editingSessionId || isEditableElement(event.target)) {
        return;
      }

      const text = event.clipboardData?.getData('text');

      if (!text) {
        return;
      }

      const targetBoxTitle = addPastedItem(text);

      if (targetBoxTitle) {
        toast.success(`Pasted ${isUrlText(text) ? 'URL' : 'text'} to ${targetBoxTitle}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [addPastedItem, editingSessionId, toggleAllMinimized]);

  return (
    <div
      className="relative h-screen w-full overflow-hidden bg-neutral-950"
      onPointerDown={() => setActiveBox(null)}
    >
      <Background />
      <BrandBadge />
      <Toaster theme="dark" position="top-center" />
      <SnapOverlay />

      {boxes
        .filter((box) => !box.isMinimized)
        .map((box) => (
          <BoxContainer key={box.id} data={box} />
        ))}

      <TrayDock />
    </div>
  );
}
