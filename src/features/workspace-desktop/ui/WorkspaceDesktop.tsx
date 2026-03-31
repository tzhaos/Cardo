import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { useI18n } from '../../../domains/i18n/hooks/useI18n';
import { isUrlText } from '../../../domains/items/services/isUrlText';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { getBoxDisplayTitle } from '../../../domains/workspace/model/boxTitles';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import { isEditableElement } from '../../../lib/dom';
import Background from '../../../widgets/DesktopShell/Background';
import BrandBadge from '../../../widgets/DesktopShell/BrandBadge';
import BoxContainer from '../../../widgets/Box/BoxContainer';
import TrayDock from '../../tray/ui/TrayDock';
import SnapOverlay from './SnapOverlay';

export default function WorkspaceDesktop() {
  const { t } = useI18n();
  const boxes = useWorkspaceStore((state) => state.boxes);
  const toggleAllMinimized = useWorkspaceStore((state) => state.toggleAllMinimized);
  const addPastedItem = useWorkspaceStore((state) => state.addPastedItem);
  const setActiveBox = useUIStore((state) => state.setActiveBox);
  const editingSessionId = useUIStore((state) => state.editingSessionId);

  useEffect(() => {
    document.title = t('app.brand');
  }, [t]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || editingSessionId || isEditableElement(event.target)) {
        return;
      }

      if (event.ctrlKey && event.key === '`') {
        const areBoxesMinimized = toggleAllMinimized();
        toast(areBoxesMinimized ? t('workspace.hideAllBoxes') : t('workspace.showAllBoxes'));
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

      const targetBoxId = addPastedItem(text);

      if (targetBoxId) {
        const targetBox = boxes.find((box) => box.id === targetBoxId);

        if (!targetBox) {
          return;
        }

        toast.success(
          t('workspace.pastedTypeToBox', {
            itemType: isUrlText(text) ? t('workspace.pastedUrl') : t('workspace.pastedText'),
            boxTitle: getBoxDisplayTitle(targetBox),
          }),
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [addPastedItem, boxes, editingSessionId, t, toggleAllMinimized]);

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
