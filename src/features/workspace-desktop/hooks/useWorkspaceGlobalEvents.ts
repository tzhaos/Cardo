import { useEffect, useEffectEvent } from 'react';
import { toast } from 'sonner';
import { useI18n } from '../../../domains/i18n/hooks/useI18n';
import { isUrlText } from '../../../domains/items/services/isUrlText';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { getBoxDisplayTitle } from '../../../domains/workspace/model/boxTitles';
import { getBoxById } from '../../../domains/workspace/model/workspaceState';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import { isEditableElement } from '../../../lib/dom';

export function useWorkspaceGlobalEvents() {
  const { t } = useI18n();

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const { editingSessionId } = useUIStore.getState();

    if (event.defaultPrevented || editingSessionId || isEditableElement(event.target)) {
      return;
    }

    if (event.ctrlKey && event.key === '`') {
      const areBoxesMinimized = useWorkspaceStore.getState().toggleAllMinimized();
      toast(areBoxesMinimized ? t('workspace.hideAllBoxes') : t('workspace.showAllBoxes'));
    }
  });

  const handlePaste = useEffectEvent((event: ClipboardEvent) => {
    const { activeBoxId, editingSessionId } = useUIStore.getState();

    if (event.defaultPrevented || editingSessionId || isEditableElement(event.target)) {
      return;
    }

    const text = event.clipboardData?.getData('text');

    if (!text) {
      return;
    }

    const workspaceState = useWorkspaceStore.getState();
    const targetBoxId = workspaceState.addPastedItem(text, activeBoxId);

    if (!targetBoxId) {
      return;
    }

    const targetBox = getBoxById(useWorkspaceStore.getState(), targetBoxId);

    if (!targetBox) {
      return;
    }

    toast.success(
      t('workspace.pastedTypeToBox', {
        itemType: isUrlText(text) ? t('workspace.pastedUrl') : t('workspace.pastedText'),
        boxTitle: getBoxDisplayTitle(targetBox),
      }),
    );
  });

  useEffect(() => {
    document.title = t('app.brand');
  }, [t]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleKeyDown, handlePaste]);
}
