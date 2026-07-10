import { useMemo } from 'react';
import { useUiStore } from '../../../app/stores/uiStore';
import { parseFolderPathInput } from '../../../domain/itemMetadata';
import { useI18n } from '../../../i18n/useI18n';
import { AddViewShell } from './AddViewShell';

export function FolderAddView({ boxId }: { boxId: string }) {
  const draftState = useUiStore((state) => state.addDrafts[boxId]);
  const draft = useMemo(() => draftState?.draft ?? {}, [draftState?.draft]);
  const updateDraft = useUiStore((state) => state.updateDraft);
  const { t } = useI18n();
  const path = draft.path ?? '';
  const normalizedPath = parseFolderPathInput(path);
  const showInvalidPath = path.trim().length > 0 && !normalizedPath;

  return (
    <AddViewShell
      boxId={boxId}
      type="folder"
      title={t('add.folderTitle')}
      canSubmit={Boolean(normalizedPath)}
    >
      <input
        autoFocus
        aria-invalid={showInvalidPath}
        placeholder={t('field.folderPath')}
        value={path}
        onChange={(event) => updateDraft(boxId, { path: event.target.value })}
      />
      {showInvalidPath ? (
        <small className="wbn-field-error">{t('field.folderPathError')}</small>
      ) : null}
    </AddViewShell>
  );
}
