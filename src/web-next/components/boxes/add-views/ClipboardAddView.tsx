import { useMemo } from 'react';
import { useUiStore } from '../../../app/stores/uiStore';
import { AddViewShell } from './AddViewShell';
import { useI18n } from '../../../i18n/useI18n';
import { Textarea } from '../../../ui/primitives/textarea';

export function ClipboardAddView({
  boxId,
  typePicker,
}: {
  boxId: string;
  typePicker?: React.ReactNode;
}) {
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
      typePicker={typePicker}
    >
      <Textarea
        autoFocus
        className="cardo-clipboard-compose"
        placeholder={t('field.clipText')}
        value={text}
        onChange={(event) => updateDraft(boxId, { text: event.target.value })}
      />
    </AddViewShell>
  );
}
