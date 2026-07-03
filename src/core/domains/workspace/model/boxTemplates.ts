import type { MessageKey } from '../../i18n/model/messages';
import {
  DEFAULT_KANBAN_COLUMNS,
  type BoxLayout,
  type BoxTemplateId,
  type WorkspaceBoxBounds,
  type WorkspaceBoxTemplateState,
} from './workspace';

export interface BoxTemplateDefinition {
  id: BoxTemplateId;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  actionKey: MessageKey;
  defaultLayout: BoxLayout;
  defaultBounds: Pick<WorkspaceBoxBounds, 'width' | 'height'>;
  createDefaultState: () => WorkspaceBoxTemplateState;
}

const EMPTY_TEMPLATE_STATE = () => ({});

export const BOX_TEMPLATE_DEFINITIONS = {
  collection: {
    id: 'collection',
    titleKey: 'template.collection',
    descriptionKey: 'template.collection.description',
    actionKey: 'template.collection.action',
    defaultLayout: 'list',
    defaultBounds: { width: 340, height: 420 },
    createDefaultState: EMPTY_TEMPLATE_STATE,
  },
  kanban: {
    id: 'kanban',
    titleKey: 'template.kanban',
    descriptionKey: 'template.kanban.description',
    actionKey: 'template.kanban.action',
    defaultLayout: 'list',
    defaultBounds: { width: 680, height: 440 },
    createDefaultState: () => ({
      kanbanColumns: DEFAULT_KANBAN_COLUMNS.map((column) => ({ ...column })),
    }),
  },
  launcher: {
    id: 'launcher',
    titleKey: 'template.launcher',
    descriptionKey: 'template.launcher.description',
    actionKey: 'template.launcher.action',
    defaultLayout: 'grid',
    defaultBounds: { width: 340, height: 280 },
    createDefaultState: EMPTY_TEMPLATE_STATE,
  },
  inbox: {
    id: 'inbox',
    titleKey: 'template.inbox',
    descriptionKey: 'template.inbox.description',
    actionKey: 'template.inbox.action',
    defaultLayout: 'list',
    defaultBounds: { width: 340, height: 420 },
    createDefaultState: EMPTY_TEMPLATE_STATE,
  },
} as const satisfies Record<BoxTemplateId, BoxTemplateDefinition>;

export const BOX_TEMPLATE_LIBRARY: BoxTemplateDefinition[] = [
  BOX_TEMPLATE_DEFINITIONS.collection,
  BOX_TEMPLATE_DEFINITIONS.kanban,
  BOX_TEMPLATE_DEFINITIONS.launcher,
  BOX_TEMPLATE_DEFINITIONS.inbox,
];

export function getBoxTemplateDefinition(templateId: BoxTemplateId): BoxTemplateDefinition {
  return BOX_TEMPLATE_DEFINITIONS[templateId];
}

export function createDefaultTemplateState(templateId: BoxTemplateId): WorkspaceBoxTemplateState {
  return getBoxTemplateDefinition(templateId).createDefaultState();
}
