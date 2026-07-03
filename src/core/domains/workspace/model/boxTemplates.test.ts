import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOX_TEMPLATE_LIBRARY,
  createDefaultTemplateState,
  getBoxTemplateDefinition,
} from './boxTemplates';
import { DEFAULT_KANBAN_COLUMNS } from './workspace';

test('box template library keeps product-facing template order', () => {
  assert.deepEqual(
    BOX_TEMPLATE_LIBRARY.map((template) => template.id),
    ['collection', 'kanban', 'launcher', 'inbox'],
  );
});

test('box template definitions provide default layout and bounds', () => {
  const launcher = getBoxTemplateDefinition('launcher');
  const kanban = getBoxTemplateDefinition('kanban');

  assert.equal(launcher.defaultLayout, 'grid');
  assert.deepEqual(launcher.defaultBounds, { width: 340, height: 280 });
  assert.equal(kanban.defaultLayout, 'list');
  assert.deepEqual(kanban.defaultBounds, { width: 680, height: 440 });
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
