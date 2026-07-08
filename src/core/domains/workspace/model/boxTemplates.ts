import type { MessageKey } from '../../i18n/model/messages';
import type { ItemDraft } from '../../items/model/item';
import {
  DEFAULT_DAILY_DESK_COLUMNS,
  DEFAULT_KANBAN_COLUMNS,
  DEFAULT_PROJECT_BOARD_COLUMNS,
  type BoxLayout,
  type BoxTemplateId,
  type WorkspaceBoxBounds,
  type WorkspaceBoxTemplateState,
} from './workspace';

export interface BoxTemplateDefaultItem {
  draft: ItemDraft;
  isPinned?: boolean;
  columnId?: string;
}

export interface BoxTemplateDefinition {
  id: BoxTemplateId;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  actionKey: MessageKey;
  defaultLayout: BoxLayout;
  defaultBounds: Pick<WorkspaceBoxBounds, 'width' | 'height'>;
  createDefaultState: () => WorkspaceBoxTemplateState;
  createDefaultItems: () => BoxTemplateDefaultItem[];
}

const EMPTY_TEMPLATE_STATE = () => ({});
const EMPTY_DEFAULT_ITEMS = () => [];

export const BOX_TEMPLATE_DEFINITIONS = {
  collection: {
    id: 'collection',
    titleKey: 'template.collection',
    descriptionKey: 'template.collection.description',
    actionKey: 'template.collection.action',
    defaultLayout: 'list',
    defaultBounds: { width: 340, height: 420 },
    createDefaultState: EMPTY_TEMPLATE_STATE,
    createDefaultItems: EMPTY_DEFAULT_ITEMS,
  },
  'web-library': {
    id: 'web-library',
    titleKey: 'template.webLibrary',
    descriptionKey: 'template.webLibrary.description',
    actionKey: 'template.webLibrary.action',
    defaultLayout: 'list',
    defaultBounds: { width: 460, height: 460 },
    createDefaultState: EMPTY_TEMPLATE_STATE,
    createDefaultItems: EMPTY_DEFAULT_ITEMS,
  },
  'frequent-sites': {
    id: 'frequent-sites',
    titleKey: 'template.frequentSites',
    descriptionKey: 'template.frequentSites.description',
    actionKey: 'template.frequentSites.action',
    defaultLayout: 'grid',
    defaultBounds: { width: 360, height: 320 },
    createDefaultState: EMPTY_TEMPLATE_STATE,
    createDefaultItems: EMPTY_DEFAULT_ITEMS,
  },
  'reading-list': {
    id: 'reading-list',
    titleKey: 'template.readingList',
    descriptionKey: 'template.readingList.description',
    actionKey: 'template.readingList.action',
    defaultLayout: 'list',
    defaultBounds: { width: 380, height: 420 },
    createDefaultState: EMPTY_TEMPLATE_STATE,
    createDefaultItems: EMPTY_DEFAULT_ITEMS,
  },
  'project-board': {
    id: 'project-board',
    titleKey: 'template.projectBoard',
    descriptionKey: 'template.projectBoard.description',
    actionKey: 'template.projectBoard.action',
    defaultLayout: 'list',
    defaultBounds: { width: 760, height: 460 },
    createDefaultState: () => ({
      kanbanColumns: DEFAULT_PROJECT_BOARD_COLUMNS.map((column) => ({ ...column })),
    }),
    createDefaultItems: () => [
      {
        draft: {
          type: 'note',
          title: 'Project brief',
          content: 'Define the outcome, owner, and next decision for this project.',
        },
        columnId: 'backlog',
        isPinned: true,
      },
    ],
  },
  'daily-desk': {
    id: 'daily-desk',
    titleKey: 'template.dailyDesk',
    descriptionKey: 'template.dailyDesk.description',
    actionKey: 'template.dailyDesk.action',
    defaultLayout: 'list',
    defaultBounds: { width: 720, height: 440 },
    createDefaultState: () => ({
      kanbanColumns: DEFAULT_DAILY_DESK_COLUMNS.map((column) => ({ ...column })),
    }),
    createDefaultItems: () => [
      {
        draft: {
          type: 'note',
          title: "Today's focus",
          content: 'Pick one outcome for this desk before adding more items.',
        },
        columnId: 'today',
        isPinned: true,
      },
      {
        draft: {
          type: 'note',
          title: 'Quick capture',
          content: 'Drop loose links, notes, files, or tasks here and route them during the day.',
        },
        columnId: 'capture',
      },
    ],
  },
  kanban: {
    id: 'kanban',
    titleKey: 'template.kanban',
    descriptionKey: 'template.kanban.description',
    actionKey: 'template.kanban.action',
    defaultLayout: 'list',
    defaultBounds: { width: 360, height: 280 },
    createDefaultState: () => ({
      kanbanColumns: DEFAULT_KANBAN_COLUMNS.map((column) => ({ ...column })),
    }),
    createDefaultItems: EMPTY_DEFAULT_ITEMS,
  },
  launcher: {
    id: 'launcher',
    titleKey: 'template.launcher',
    descriptionKey: 'template.launcher.description',
    actionKey: 'template.launcher.action',
    defaultLayout: 'grid',
    defaultBounds: { width: 340, height: 280 },
    createDefaultState: EMPTY_TEMPLATE_STATE,
    createDefaultItems: EMPTY_DEFAULT_ITEMS,
  },
  inbox: {
    id: 'inbox',
    titleKey: 'template.inbox',
    descriptionKey: 'template.inbox.description',
    actionKey: 'template.inbox.action',
    defaultLayout: 'list',
    defaultBounds: { width: 340, height: 420 },
    createDefaultState: EMPTY_TEMPLATE_STATE,
    createDefaultItems: EMPTY_DEFAULT_ITEMS,
  },
} as const satisfies Record<BoxTemplateId, BoxTemplateDefinition>;

export const BOX_TEMPLATE_LIBRARY: BoxTemplateDefinition[] = [
  BOX_TEMPLATE_DEFINITIONS.collection,
  BOX_TEMPLATE_DEFINITIONS['web-library'],
  BOX_TEMPLATE_DEFINITIONS['frequent-sites'],
  BOX_TEMPLATE_DEFINITIONS['reading-list'],
  BOX_TEMPLATE_DEFINITIONS.launcher,
];

export function getBoxTemplateDefinition(templateId: BoxTemplateId): BoxTemplateDefinition {
  return BOX_TEMPLATE_DEFINITIONS[templateId];
}

export function createDefaultTemplateState(templateId: BoxTemplateId): WorkspaceBoxTemplateState {
  return getBoxTemplateDefinition(templateId).createDefaultState();
}

export function createDefaultTemplateItems(templateId: BoxTemplateId): BoxTemplateDefaultItem[] {
  return getBoxTemplateDefinition(templateId).createDefaultItems();
}
