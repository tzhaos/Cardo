import { useEffect, useEffectEvent } from 'react';
import { toast } from 'sonner';
import { useI18n } from '../../../app/hooks/useI18n';
import { runtimeDocumentPort } from '../../../app/ports/defaultPorts';
import { pasteTextItem } from '../../../app/use-cases/pasteTextItem';
import { toggleAllBoxesMinimized } from '../../../app/use-cases/toggleAllBoxesMinimized';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useWorkspaceStore } from '../../../app/stores/useWorkspaceStore';
import { ITEM_TYPE_LABEL_KEYS } from '../../../domains/i18n/model/messages';
import { getBoxDisplayTitle } from '../../../domains/workspace/model/boxTitles';
import { getWorkspaceBox } from '../../../domains/workspace/model/workspaceSelectors';
import { isEditableElement } from '../../../lib/dom';

export function useWorkspaceGlobalEvents() {
  const { t } = useI18n();

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const { editingSessionId } = useInteractionStore.getState();

    if (event.defaultPrevented || editingSessionId || isEditableElement(event.target)) {
      return;
    }

    if (event.ctrlKey && event.key === '`') {
      const areBoxesMinimized = toggleAllBoxesMinimized();
      toast(areBoxesMinimized ? t('workspace.hideAllBoxes') : t('workspace.showAllBoxes'));
    }
  });

  const handlePaste = useEffectEvent((event: ClipboardEvent) => {
    const { activeBoxId, editingSessionId } = useInteractionStore.getState();

    if (event.defaultPrevented || editingSessionId || isEditableElement(event.target)) {
      return;
    }

    const text = event.clipboardData?.getData('text');

    if (!text) {
      return;
    }

    const pastedResult = pasteTextItem(text, activeBoxId);

    if (!pastedResult) {
      return;
    }

    const targetBox = getWorkspaceBox(useWorkspaceStore.getState().snapshot, pastedResult.boxId);

    if (!targetBox) {
      return;
    }

    toast.success(
      t('workspace.pastedTypeToBox', {
        itemType:
          pastedResult.item.type === 'url'
            ? t('workspace.pastedUrl')
            : pastedResult.item.type === 'note'
              ? t('workspace.pastedText')
              : t(ITEM_TYPE_LABEL_KEYS[pastedResult.item.type]),
        boxTitle: getBoxDisplayTitle(targetBox, t),
      }),
    );
  });

  useEffect(() => {
    runtimeDocumentPort.setDocumentTitle(t('app.brand'));
  }, [t]);

  useEffect(() => {
    runtimeDocumentPort.addWindowListener('keydown', handleKeyDown);
    runtimeDocumentPort.addWindowListener('paste', handlePaste);

    return () => {
      runtimeDocumentPort.removeWindowListener('keydown', handleKeyDown);
      runtimeDocumentPort.removeWindowListener('paste', handlePaste);
    };
  }, [handleKeyDown, handlePaste]);
}
