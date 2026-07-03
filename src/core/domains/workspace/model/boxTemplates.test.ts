import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOX_TEMPLATE_LIBRARY,
  createDefaultTemplateItems,
  createDefaultTemplateState,
  getBoxTemplateDefinition,
} from './boxTemplates';
import { DEFAULT_KANBAN_COLUMNS, DEFAULT_PROJECT_BOARD_COLUMNS } from './workspace';

test('box template library keeps product-facing template order', () => {
  assert.deepEqual(
    BOX_TEMPLATE_LIBRARY.map((template) => template.id),
    ['collection', 'project-board', 'kanban', 'launcher', 'inbox'],
  );
});

test('box template definitions provide default layout and bounds', () => {
  const launcher = getBoxTemplateDefinition('launcher');
  const kanban = getBoxTemplateDefinition('kanban');
  const projectBoard = getBoxTemplateDefinition('project-board');

  assert.equal(launcher.defaultLayout, 'grid');
  assert.deepEqual(launcher.defaultBounds, { width: 340, height: 280 });
  assert.equal(kanban.defaultLayout, 'list');
  assert.deepEqual(kanban.defaultBounds, { width: 680, height: 440 });
  assert.equal(projectBoard.defaultLayout, 'list');
  assert.deepEqual(projectBoard.defaultBounds, { width: 760, height: 460 });
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
