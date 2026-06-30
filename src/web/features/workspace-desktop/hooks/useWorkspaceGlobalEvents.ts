import { useEffect, useEffectEvent } from 'react';
import { presentToastSpec } from '../../../app/presentation/toastSpec';
import { useI18n } from '../../../app/hooks/useI18n';
import { getInteractionSnapshot } from '../../../app/controllers/interactionController';
import {
  addRuntimeWindowListener,
  removeRuntimeWindowListener,
  setRuntimeDocumentTitle,
} from '../../../app/controllers/runtimeDocumentController';
import { describePasteToWorkspaceToastSpec } from '../../../app/use-cases/describePasteToWorkspaceToast';
import { pasteTextItem } from '../../../app/use-cases/pasteTextItem';
import { useWorkspaceSnapshot } from '../../../app/stores/useWorkspaceSelectors';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
import { isEditableElement } from '../../../lib/dom';

export function useWorkspaceGlobalEvents() {
  const { t } = useI18n();
  const snapshot = useWorkspaceSnapshot();
  const setPanModifierActive = useCanvasStore((state) => state.setPanModifierActive);

  const handleKeyDown = useEffectEvent((input: unknown) => {
    const event = input as KeyboardEvent;
    const { editingSessionId } = getInteractionSnapshot();

    if (event.defaultPrevented || editingSessionId || isEditableElement(event.target)) {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      setPanModifierActive(true);
      return;
    }
  });

  const handleKeyUp = useEffectEvent((input: unknown) => {
    const event = input as KeyboardEvent;

    if (event.code === 'Space') {
      setPanModifierActive(false);
    }
  });

  const handlePaste = useEffectEvent((input: unknown) => {
    const event = input as ClipboardEvent;
    const { activeBoxId, editingSessionId } = getInteractionSnapshot();

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

    presentToastSpec(t, describePasteToWorkspaceToastSpec(snapshot, pastedResult, t));
  });

  useEffect(() => {
    setRuntimeDocumentTitle(t('app.brand'));
  }, [t]);

  useEffect(() => {
    addRuntimeWindowListener('keydown', handleKeyDown);
    addRuntimeWindowListener('keyup', handleKeyUp);
    addRuntimeWindowListener('paste', handlePaste);

    return () => {
      removeRuntimeWindowListener('keydown', handleKeyDown);
      removeRuntimeWindowListener('keyup', handleKeyUp);
      removeRuntimeWindowListener('paste', handlePaste);
    };
  }, [handleKeyDown, handleKeyUp, handlePaste]);
}
