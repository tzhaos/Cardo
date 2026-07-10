import { useMemo } from 'react';
import { useUiStore } from '../../../app/stores/uiStore';
import { CustomDropdown } from '../../form/CustomDropdown';
import { AddViewShell } from './AddViewShell';
import { useI18n } from '../../../i18n/useI18n';

export function FolderAddView({ boxId }: { boxId: string }) {
  const draftState = useUiStore((state) => state.addDrafts[boxId]);
  const draft = useMemo(() => draftState?.draft ?? {}, [draftState?.draft]);
  const updateDraft = useUiStore((state) => state.updateDraft);
  const { t } = useI18n();
  const folderKindOptions = [
    { value: 'path', label: t('field.kindPath') },
    { value: 'folder', label: t('field.kindFolder') },
    { value: 'file', label: t('field.kindFile') },
  ];

  return (
    <AddViewShell boxId={boxId} type="folder" title={t('add.folderTitle')}>
      <input
        placeholder={t('field.name')}
        value={draft.title ?? ''}
        onChange={(event) => updateDraft(boxId, { title: event.target.value })}
      />
      <input
        placeholder={t('field.path')}
        value={draft.path ?? ''}
        onChange={(event) => updateDraft(boxId, { path: event.target.value })}
      />
      <CustomDropdown
        label={t('field.folderKind')}
        value={draft.kind ?? 'path'}
        options={folderKindOptions}
        onChange={(value) => updateDraft(boxId, { kind: value })}
      />
    </AddViewShell>
  );
}
