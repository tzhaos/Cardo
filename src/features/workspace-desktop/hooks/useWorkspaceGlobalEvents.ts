import { useEffect, useEffectEvent } from 'react';
import { presentToastSpec } from '../../../app/presentation/toastSpec';
import { useI18n } from '../../../app/hooks/useI18n';
import { runtimeDocumentPort } from '../../../app/ports/defaultPorts';
import { describePasteToWorkspaceToastSpec } from '../../../app/use-cases/describePasteToWorkspaceToast';
import { pasteTextItem } from '../../../app/use-cases/pasteTextItem';
import { performToggleAllBoxesHotkey } from '../../../app/use-cases/performToggleAllBoxesHotkey';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useWorkspaceStore } from '../../../app/stores/useWorkspaceStore';
import { isEditableElement } from '../../../lib/dom';

export function useWorkspaceGlobalEvents() {
  const { t } = useI18n();

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const { editingSessionId } = useInteractionStore.getState();

    if (event.defaultPrevented || editingSessionId || isEditableElement(event.target)) {
      return;
    }

    if (event.ctrlKey && event.key === '`') {
      presentToastSpec(t, performToggleAllBoxesHotkey());
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

    presentToastSpec(
      t,
      describePasteToWorkspaceToastSpec(useWorkspaceStore.getState().snapshot, pastedResult, t),
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
