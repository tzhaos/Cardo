import type { MessageKey } from '../../i18n/model/messages';
import type { WorkspaceBox } from './workspace';

export function getBoxTitleMessageKey(box: Pick<WorkspaceBox, 'role'>): MessageKey {
  if (box.role === 'folders') {
    return 'box.folders';
  }

  if (box.role === 'links') {
    return 'box.links';
  }

  if (box.role === 'notes') {
    return 'box.notes';
  }

  return 'box.new';
}

export function getBoxDisplayTitle(
  box: Pick<WorkspaceBox, 'customTitle' | 'role'>,
  resolveMessage: (key: MessageKey) => string,
) {
  return box.customTitle?.trim() || resolveMessage(getBoxTitleMessageKey(box));
}
