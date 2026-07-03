import type { MessageKey } from '../../i18n/model/messages';
import { getBoxTemplateDefinition } from './boxTemplates';
import type { WorkspaceBox } from './workspace';

export function getBoxDisplayTitle(
  box: Pick<WorkspaceBox, 'customTitle' | 'templateId'>,
  resolveMessage: (key: MessageKey) => string,
) {
  return (
    box.customTitle?.trim() || resolveMessage(getBoxTemplateDefinition(box.templateId).titleKey)
  );
}
