import type { MessageKey } from '../../i18n/model/messages';
import type { BoxTemplateId, WorkspaceBox } from './workspace';

const BOX_TEMPLATE_TITLE_KEYS = {
  collection: 'template.collection',
  kanban: 'template.kanban',
  launcher: 'template.launcher',
  inbox: 'template.inbox',
} as const satisfies Record<BoxTemplateId, MessageKey>;

export function getBoxDisplayTitle(
  box: Pick<WorkspaceBox, 'customTitle' | 'templateId'>,
  resolveMessage: (key: MessageKey) => string,
) {
  return box.customTitle?.trim() || resolveMessage(BOX_TEMPLATE_TITLE_KEYS[box.templateId]);
}
