import { useMemo } from 'react';
import { parseLocalPathText } from '../../../../core/domains/items/services/parseLocalPathText';
import { useUiStore } from '../../../app/stores/uiStore';
import type { WorkspaceItemType } from '../../../domain/workspace';
import { useI18n } from '../../../i18n/useI18n';
import { canOpenLocalPathPicker, openLocalPathPicker } from '../../../platform/hostPlatform';
import { AddViewShell } from './AddViewShell';
import { Button } from '../../../kit/button';
import { Input } from '../../../kit/input';

type LocalResourceType = Extract<WorkspaceItemType, 'file' | 'shortcut' | 'folder'>;

export function LocalResourceAddView({
  boxId,
  type,
  typePicker,
}: {
  boxId: string;
  type: LocalResourceType;
  typePicker?: React.ReactNode;
}) {
  const draftState = useUiStore((state) => state.addDrafts[boxId]);
  const draft = useMemo(() => draftState?.draft ?? {}, [draftState?.draft]);
  const updateDraft = useUiStore((state) => state.updateDraft);
  const { t } = useI18n();
  const path = draft.path ?? '';
  const parsedPath = parseLocalPathText(path);
  const validPath = parsedPath?.type === type;
  const showInvalidPath = path.trim().length > 0 && !validPath;
  const pathPickerAvailable = canOpenLocalPathPicker();

  const browsePath = async () => {
    const picked = await openLocalPathPicker({ directory: type === 'folder' });
    if (picked) {
      updateDraft(boxId, { path: picked });
    }
  };

  return (
    <AddViewShell
      boxId={boxId}
      type={type}
      title={t(getAddTitleKey(type))}
      canSubmit={validPath}
      typePicker={typePicker}
    >
      <Input
        autoFocus
        placeholder={t('field.name')}
        value={draft.title ?? ''}
        onChange={(event) => updateDraft(boxId, { title: event.target.value })}
      />
      {pathPickerAvailable ? (
        <div className="cardo-local-path-row">
          <Input
            aria-invalid={showInvalidPath}
            placeholder={t('field.localPath')}
            value={path}
            onChange={(event) => updateDraft(boxId, { path: event.target.value })}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="cardo-local-path-browse"
            onClick={() => void browsePath()}
            aria-label={t('add.browsePath')}
          >
            {t('add.browse')}
          </Button>
        </div>
      ) : (
        <Input
          aria-invalid={showInvalidPath}
          placeholder={t('field.localPath')}
          value={path}
          onChange={(event) => updateDraft(boxId, { path: event.target.value })}
        />
      )}
      {showInvalidPath ? (
        <small className="cardo-field-error">{t('field.localPathError')}</small>
      ) : null}
    </AddViewShell>
  );
}

function getAddTitleKey(type: LocalResourceType) {
  if (type === 'file') return 'add.fileTitle' as const;
  if (type === 'shortcut') return 'add.shortcutTitle' as const;
  return 'add.folderTitle' as const;
}
