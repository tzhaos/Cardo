import { useMemo } from 'react';
import { useUiStore } from '../../../app/stores/uiStore';
import { AddViewShell } from './AddViewShell';
import { useI18n } from '../../../i18n/useI18n';

export function ClipboardAddView({ boxId }: { boxId: string }) {
  const draftState = useUiStore((state) => state.addDrafts[boxId]);
  const draft = useMemo(() => draftState?.draft ?? {}, [draftState?.draft]);
  const updateDraft = useUiStore((state) => state.updateDraft);
  const { t } = useI18n();
  const text = draft.text ?? '';

  return (
    <AddViewShell
      boxId={boxId}
      type="clipboard"
      title={t('add.clipboardTitle')}
      canSubmit={text.trim().length > 0}
    >
      <input
        placeholder={t('field.clipTitle')}
        value={draft.title ?? ''}
        onChange={(event) => updateDraft(boxId, { title: event.target.value })}
      />
      <textarea
        autoFocus
        placeholder={t('field.clipText')}
        value={text}
        onChange={(event) => updateDraft(boxId, { text: event.target.value })}
      />
    </AddViewShell>
  );
}
