import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOX_TEMPLATE_LIBRARY,
  createDefaultTemplateItems,
  createDefaultTemplateState,
  getBoxTemplateDefinition,
} from './boxTemplates';
import {
  DEFAULT_DAILY_DESK_COLUMNS,
  DEFAULT_KANBAN_COLUMNS,
  DEFAULT_PROJECT_BOARD_COLUMNS,
} from './workspace';

test('box template library keeps product-facing template order', () => {
  assert.deepEqual(
    BOX_TEMPLATE_LIBRARY.map((template) => template.id),
    [
      'collection',
      'web-library',
      'frequent-sites',
      'reading-list',
      'project-board',
      'daily-desk',
      'kanban',
      'launcher',
      'inbox',
    ],
  );
});

test('box template definitions provide default layout and bounds', () => {
  const launcher = getBoxTemplateDefinition('launcher');
  const webLibrary = getBoxTemplateDefinition('web-library');
  const frequentSites = getBoxTemplateDefinition('frequent-sites');
  const readingList = getBoxTemplateDefinition('reading-list');
  const kanban = getBoxTemplateDefinition('kanban');
  const projectBoard = getBoxTemplateDefinition('project-board');
  const dailyDesk = getBoxTemplateDefinition('daily-desk');

  assert.equal(launcher.defaultLayout, 'grid');
  assert.deepEqual(launcher.defaultBounds, { width: 340, height: 280 });
  assert.equal(webLibrary.defaultLayout, 'list');
  assert.deepEqual(webLibrary.defaultBounds, { width: 460, height: 460 });
  assert.equal(frequentSites.defaultLayout, 'grid');
  assert.deepEqual(frequentSites.defaultBounds, { width: 360, height: 320 });
  assert.equal(readingList.defaultLayout, 'list');
  assert.deepEqual(readingList.defaultBounds, { width: 380, height: 420 });
  assert.equal(kanban.defaultLayout, 'list');
  assert.deepEqual(kanban.defaultBounds, { width: 680, height: 440 });
  assert.equal(projectBoard.defaultLayout, 'list');
  assert.deepEqual(projectBoard.defaultBounds, { width: 760, height: 460 });
  assert.equal(dailyDesk.defaultLayout, 'list');
  assert.deepEqual(dailyDesk.defaultBounds, { width: 720, height: 440 });
});

test('box template definitions expose product metadata', () => {
  for (const template of BOX_TEMPLATE_LIBRARY) {
    assert.match(template.descriptionKey, /^template\..+\.description$/);
    assert.match(template.actionKey, /^template\..+\.action$/);
  }
});

test('createDefaultTemplateState clones kanban columns', () => {
  const firstState = createDefaultTemplateState('kanban');
  const secondState = createDefaultTemplateState('kanban');

  assert.deepEqual(firstState.kanbanColumns, DEFAULT_KANBAN_COLUMNS);
  assert.notEqual(firstState.kanbanColumns, secondState.kanbanColumns);
  assert.notEqual(firstState.kanbanColumns?.[0], secondState.kanbanColumns?.[0]);
});

test('project board template provides default columns and starter content', () => {
  const state = createDefaultTemplateState('project-board');
  const items = createDefaultTemplateItems('project-board');

  assert.deepEqual(state.kanbanColumns, DEFAULT_PROJECT_BOARD_COLUMNS);
  assert.deepEqual(
    items.map((item) => ({
      title: item.draft.title,
      columnId: item.columnId,
      isPinned: item.isPinned,
    })),
    [{ title: 'Project brief', columnId: 'backlog', isPinned: true }],
  );
});

test('daily desk template provides default columns and starter content', () => {
  const state = createDefaultTemplateState('daily-desk');
  const items = createDefaultTemplateItems('daily-desk');

  assert.deepEqual(state.kanbanColumns, DEFAULT_DAILY_DESK_COLUMNS);
  assert.deepEqual(
    items.map((item) => ({
      title: item.draft.title,
      columnId: item.columnId,
      isPinned: item.isPinned ?? false,
    })),
    [
      { title: "Today's focus", columnId: 'today', isPinned: true },
      { title: 'Quick capture', columnId: 'capture', isPinned: false },
    ],
  );
});
