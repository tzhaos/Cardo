import { useMemo } from 'react';
import { isUrlText } from '../../../../core/domains/items/services/isUrlText';
import { useUiStore } from '../../../app/stores/uiStore';
import { AddViewShell } from './AddViewShell';
import { useI18n } from '../../../i18n/useI18n';
import { Input } from '../../../ui/primitives/input';

export function BookmarkAddView({
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
  const url = draft.url ?? '';
  const validUrl = isUrlText(url);
  const showInvalidUrl = url.trim().length > 0 && !validUrl;

  return (
    <AddViewShell
      boxId={boxId}
      type="bookmark"
      title={t('add.bookmarkTitle')}
      canSubmit={validUrl}
      typePicker={typePicker}
    >
      <Input
        autoFocus
        placeholder={t('field.title')}
        value={draft.title ?? ''}
        onChange={(event) => updateDraft(boxId, { title: event.target.value })}
      />
      <Input
        aria-invalid={showInvalidUrl}
        placeholder={t('field.pasteUrl')}
        value={url}
        onChange={(event) => updateDraft(boxId, { url: event.target.value })}
      />
      {showInvalidUrl ? <small className="cardo-field-error">{t('field.urlError')}</small> : null}
    </AddViewShell>
  );
}
