import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterInboxRouteTargets,
  pushRecentInboxRouteTargetId,
  sectionInboxRouteTargets,
  type InboxRouteTarget,
} from './inboxRouteTargets';

const TARGETS: InboxRouteTarget[] = [
  {
    id: 'box-a',
    label: 'Project',
    boxId: 'box-a',
    boxLabel: 'Project',
    searchText: 'project collection',
  },
  {
    id: 'box-b:doing',
    label: 'Board / Doing',
    boxId: 'box-b',
    boxLabel: 'Board',
    columnId: 'doing',
    columnLabel: 'Doing',
    searchText: 'board kanban doing',
  },
  {
    id: 'box-b:done',
    label: 'Board / Done',
    boxId: 'box-b',
    boxLabel: 'Board',
    columnId: 'done',
    columnLabel: 'Done',
    searchText: 'board kanban done',
  },
];

test('pushRecentInboxRouteTargetId moves an existing target to the front', () => {
  assert.deepEqual(pushRecentInboxRouteTargetId(['box-a', 'box-b:doing'], 'box-a'), [
    'box-a',
    'box-b:doing',
  ]);
  assert.deepEqual(pushRecentInboxRouteTargetId(['box-a', 'box-b:doing'], 'box-b:done'), [
    'box-b:done',
    'box-a',
    'box-b:doing',
  ]);
});

test('pushRecentInboxRouteTargetId caps recent targets', () => {
  assert.deepEqual(pushRecentInboxRouteTargetId(['a', 'b', 'c', 'd'], 'e'), ['e', 'a', 'b', 'c']);
});

test('filterInboxRouteTargets matches box and column text', () => {
  assert.deepEqual(
    filterInboxRouteTargets(TARGETS, 'doing').map((target) => target.id),
    ['box-b:doing'],
  );
  assert.deepEqual(
    filterInboxRouteTargets(TARGETS, 'kanban').map((target) => target.id),
    ['box-b:doing', 'box-b:done'],
  );
});

test('sectionInboxRouteTargets keeps recent targets first and removes stale ids', () => {
  const sections = sectionInboxRouteTargets(TARGETS, ['missing', 'box-b:done', 'box-a'], '');

  assert.deepEqual(
    sections.recentTargets.map((target) => target.id),
    ['box-b:done', 'box-a'],
  );
  assert.deepEqual(
    sections.otherTargets.map((target) => target.id),
    ['box-b:doing'],
  );
});

test('sectionInboxRouteTargets filters recent targets with query', () => {
  const sections = sectionInboxRouteTargets(TARGETS, ['box-b:done', 'box-a'], 'board');

  assert.deepEqual(
    sections.recentTargets.map((target) => target.id),
    ['box-b:done'],
  );
  assert.deepEqual(
    sections.otherTargets.map((target) => target.id),
    ['box-b:doing'],
  );
});
