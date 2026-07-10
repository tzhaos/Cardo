import { useMemo } from 'react';
import { useUiStore } from '../../../app/stores/uiStore';
import { AddViewShell } from './AddViewShell';
import { useI18n } from '../../../i18n/useI18n';

export function BookmarkAddView({ boxId }: { boxId: string }) {
  const draftState = useUiStore((state) => state.addDrafts[boxId]);
  const draft = useMemo(() => draftState?.draft ?? {}, [draftState?.draft]);
  const updateDraft = useUiStore((state) => state.updateDraft);
  const { t } = useI18n();

  return (
    <AddViewShell boxId={boxId} type="bookmark" title={t('add.bookmarkTitle')}>
      <input
        placeholder={t('field.pasteUrl')}
        value={draft.url ?? ''}
        onChange={(event) => updateDraft(boxId, { url: event.target.value })}
      />
      <input
        placeholder={t('field.title')}
        value={draft.title ?? ''}
        onChange={(event) => updateDraft(boxId, { title: event.target.value })}
      />
    </AddViewShell>
  );
}
