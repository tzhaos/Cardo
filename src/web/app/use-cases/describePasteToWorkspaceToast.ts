import { ITEM_TYPE_LABEL_KEYS } from '../../../core/domains/i18n/model/messages';
import type { WorkspaceItem } from '../../../core/domains/items/model/item';
import { getBoxDisplayTitle } from '../../../core/domains/workspace/model/boxTitles';
import type { WorkspaceSnapshot } from '../../../core/domains/workspace/model/workspace';
import { getWorkspaceBox } from '../../../core/domains/workspace/model/workspaceSelectors';
import type { ToastParamValue, ToastSpec } from '../presentation/toastSpec';
import type { TranslateFn } from '../hooks/useI18n';

function itemTypeParam(pasted: WorkspaceItem): ToastParamValue {
  if (pasted.type === 'url') {
    return { i18nKey: 'workspace.pastedUrl' };
  }

  if (pasted.type === 'note') {
    return { i18nKey: 'workspace.pastedText' };
  }

  return { i18nKey: ITEM_TYPE_LABEL_KEYS[pasted.type] };
}

export function describePasteToWorkspaceToastSpec(
  snapshot: WorkspaceSnapshot,
  pasted: { boxId: string; item: WorkspaceItem },
  t: TranslateFn,
): ToastSpec | null {
  const targetBox = getWorkspaceBox(snapshot, pasted.boxId);

  if (!targetBox) {
    return null;
  }

  return {
    level: 'success',
    messageKey: 'workspace.pastedTypeToBox',
    params: {
      itemType: itemTypeParam(pasted.item),
      boxTitle: getBoxDisplayTitle(targetBox, t),
    },
  };
}
