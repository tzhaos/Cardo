import type { MessageKey } from '../../i18n/model/messages';
import type { WorkspaceBox } from './workspace';

export function getBoxDisplayTitle(
  box: Pick<WorkspaceBox, 'customTitle'>,
  resolveMessage: (key: MessageKey) => string,
) {
  return box.customTitle?.trim() || resolveMessage('box.new');
}
