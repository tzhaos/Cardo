import assert from 'node:assert/strict';
import test from 'node:test';
import { createBookmark } from '../../bookmarks/services/createBookmark';
import { createWorkspaceItem } from '../../items/model/item';
import {
  createInitialWorkspaceSnapshot,
  ensureDefaultWorkspacePageBoxes,
} from './createInitialWorkspaceSnapshot';
import { reduceWorkspace } from './reduceWorkspace';
import { getBoxItems } from './workspaceSelectors';
import {
  DEFAULT_KANBAN_COLUMNS,
  WORKSPACE_EXPORT_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  type WorkspaceBoxWithItems,
} from './workspace';
import {
  createWorkspaceExportDocument,
  parseWorkspaceExportDocument,
  parseWorkspaceSnapshot,
} from './workspaceCodec';

test('workspace reducer keeps items global and pin state in placements', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const noteItem = createWorkspaceItem('item-note', {
    type: 'note',
    title: 'Scratch',
    content: 'Initial note',
  });

  const withItem = reduceWorkspace(snapshot, {
    type: 'item.add',
    boxId: 'default-inbox',
    item: noteItem,
  });
  assert.equal(Object.keys(withItem.itemsById).length, 1);
  assert.equal(getBoxItems(withItem, 'default-inbox')[0].title, 'Scratch');
  assert.equal(getBoxItems(withItem, 'default-inbox')[0].isPinned, false);

  const withUpdatedItem = reduceWorkspace(withItem, {
    type: 'item.update',
    boxId: 'default-inbox',
    itemId: noteItem.id,
    updates: {
      title: 'Updated scratch',
      text: 'Updated note',
    },
  });
  assert.equal(withUpdatedItem.itemsById[noteItem.id].title, 'Updated scratch');
  const updatedPlacedItem = getBoxItems(withUpdatedItem, 'default-inbox')[0];
  assert.equal(updatedPlacedItem.type, 'note');
  assert.equal(updatedPlacedItem.type === 'note' ? updatedPlacedItem.text : null, 'Updated note');

  const withPinnedItem = reduceWorkspace(withUpdatedItem, {
    type: 'item.setPinned',
    boxId: 'default-inbox',
    itemId: noteItem.id,
    isPinned: true,
  });
  assert.equal(withPinnedItem.itemPlacementsByBoxId['default-inbox'][0].isPinned, true);

  const withoutItem = reduceWorkspace(withPinnedItem, {
    type: 'item.delete',
    boxId: 'default-inbox',
    itemId: noteItem.id,
  });
  assert.equal(withoutItem.itemPlacementsByBoxId['default-inbox'].length, 0);
  assert.equal(withoutItem.itemsById[noteItem.id], undefined);
});

test('bookmarks stay independent from box item placement lifecycle', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const bookmark = createBookmark(
    'bookmark-example',
    {
      title: 'Example',
      url: 'https://example.com/docs',
      source: 'manual',
    },
    new Date('2026-01-01T00:00:00.000Z'),
  );
  const item = createWorkspaceItem('item-example', {
    type: 'url',
    title: 'Example docs',
    content: bookmark.url,
    bookmarkId: bookmark.id,
  });

  const withBookmark = reduceWorkspace(snapshot, {
    type: 'bookmark.upsert',
    bookmark,
  });
  const withItem = reduceWorkspace(withBookmark, {
    type: 'item.add',
    boxId: 'default-inbox',
    item,
  });
  const withoutBox = reduceWorkspace(withItem, {
    type: 'box.delete',
    boxId: 'default-inbox',
  });

  assert.equal(withoutBox.itemsById[item.id], undefined);
  assert.equal(withoutBox.bookmarksById[bookmark.id].url, 'https://example.com/docs');
});

test('bookmark open commands update frequent site signals', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const bookmark = createBookmark(
    'bookmark-khaos',
    {
      title: 'KhaosBox',
      url: 'https://example.com',
    },
    new Date('2026-01-01T00:00:00.000Z'),
  );
  const withBookmark = reduceWorkspace(snapshot, { type: 'bookmark.upsert', bookmark });
  const opened = reduceWorkspace(withBookmark, {
    type: 'bookmark.recordOpen',
    bookmarkId: bookmark.id,
    openedAt: '2026-02-01T00:00:00.000Z',
  });

  assert.equal(opened.bookmarksById[bookmark.id].openCount, 1);
  assert.equal(opened.bookmarksById[bookmark.id].lastOpenedAt, '2026-02-01T00:00:00.000Z');
});

test('move item inherits placement pin state without mutating item entity', () => {
  const sourceItem = createWorkspaceItem('item-source', {
    type: 'folder',
    title: 'Source',
    content: 'C:\\Source',
  });
  const pinnedTarget = createWorkspaceItem('item-target', {
    type: 'url',
    title: 'Pinned target',
    content: 'https://example.com',
  });
  const foldersBox = {
    id: 'system-folders',
    customTitle: 'Folders',
    templateId: 'collection',
    templateState: {},
    bounds: { x: 100, y: 100, width: 320, height: 400 },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: 'grid',
    zIndex: 10,
    items: [{ ...sourceItem, boxId: 'system-folders', isPinned: false }],
  } satisfies WorkspaceBoxWithItems;
  const linksBox = {
    id: 'system-links',
    customTitle: 'Links',
    templateId: 'collection',
    templateState: {},
    bounds: { x: 450, y: 100, width: 320, height: 400 },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: 'list',
    zIndex: 11,
    items: [{ ...pinnedTarget, boxId: 'system-links', isPinned: true }],
  } satisfies WorkspaceBoxWithItems;
  const notesBox = {
    id: 'system-notes',
    customTitle: 'Notes',
    templateId: 'collection',
    templateState: {},
    bounds: { x: 800, y: 100, width: 320, height: 400 },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: 'list',
    zIndex: 12,
    items: [],
  } satisfies WorkspaceBoxWithItems;

  const snapshot = reduceWorkspace(createInitialWorkspaceSnapshot(), {
    type: 'workspace.replaceBoxes',
    boxes: [foldersBox, linksBox, notesBox],
  });
  const nextState = reduceWorkspace(snapshot, {
    type: 'item.move',
    itemId: sourceItem.id,
    sourceBoxId: 'system-folders',
    targetBoxId: 'system-links',
    targetIndex: 0,
  });

  assert.equal(getBoxItems(snapshot, 'system-folders')[0].isPinned, false);
  assert.equal(getBoxItems(nextState, 'system-folders').length, 0);
  assert.equal(getBoxItems(nextState, 'system-links').length, 2);
  assert.equal(getBoxItems(nextState, 'system-links')[0].id, sourceItem.id);
  assert.equal(getBoxItems(nextState, 'system-links')[0].isPinned, true);
  assert.equal(nextState.itemsById[sourceItem.id].type, 'folder');
});

test('move item can assign a kanban column placement', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const cardItem = createWorkspaceItem('item-card', {
    type: 'note',
    title: 'Ship kanban',
    content: 'Connect cards to columns',
  });
  const withCard = reduceWorkspace(snapshot, {
    type: 'item.add',
    boxId: 'default-kanban',
    item: cardItem,
    columnId: 'todo',
  });
  const movedCard = reduceWorkspace(withCard, {
    type: 'item.move',
    itemId: cardItem.id,
    sourceBoxId: 'default-kanban',
    targetBoxId: 'default-kanban',
    targetColumnId: 'doing',
  });

  assert.equal(movedCard.itemPlacementsByBoxId['default-kanban'][0].columnId, 'doing');
  assert.equal(getBoxItems(movedCard, 'default-kanban')[0].columnId, 'doing');
});

test('kanban column commands manage columns and reroute deleted cards', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const cardItem = createWorkspaceItem('item-card', {
    type: 'note',
    title: 'Blocked card',
    content: 'Needs a real lane',
  });
  const withCard = reduceWorkspace(snapshot, {
    type: 'item.add',
    boxId: 'default-kanban',
    item: cardItem,
    columnId: 'doing',
  });
  const withBlockedColumn = reduceWorkspace(withCard, {
    type: 'kanban.column.add',
    boxId: 'default-kanban',
    column: { id: 'blocked', title: 'Blocked' },
    afterColumnId: 'doing',
  });
  const withRenamedColumn = reduceWorkspace(withBlockedColumn, {
    type: 'kanban.column.update',
    boxId: 'default-kanban',
    columnId: 'blocked',
    title: 'Waiting',
  });
  const withMovedColumn = reduceWorkspace(withRenamedColumn, {
    type: 'kanban.column.move',
    boxId: 'default-kanban',
    columnId: 'blocked',
    targetIndex: 1,
  });
  const withDeletedColumn = reduceWorkspace(withMovedColumn, {
    type: 'kanban.column.delete',
    boxId: 'default-kanban',
    columnId: 'doing',
    fallbackColumnId: 'todo',
  });

  assert.deepEqual(
    withBlockedColumn.boxesById['default-kanban'].templateState.kanbanColumns?.map(
      (column) => column.id,
    ),
    ['todo', 'doing', 'blocked', 'done'],
  );
  assert.deepEqual(
    withMovedColumn.boxesById['default-kanban'].templateState.kanbanColumns?.map((column) => [
      column.id,
      column.title,
    ]),
    [
      ['todo', DEFAULT_KANBAN_COLUMNS[0].title],
      ['blocked', 'Waiting'],
      ['doing', DEFAULT_KANBAN_COLUMNS[1].title],
      ['done', DEFAULT_KANBAN_COLUMNS[2].title],
    ],
  );
  assert.equal(withDeletedColumn.itemPlacementsByBoxId['default-kanban'][0].columnId, 'todo');
  assert.equal(
    withDeletedColumn.boxesById['default-kanban'].templateState.kanbanColumns?.some(
      (column) => column.id === 'doing',
    ),
    false,
  );
});

test('workspace export document round-trips with current schema', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const bookmark = createBookmark(
    'bookmark-export',
    {
      title: 'Exported link',
      url: 'https://example.com',
      isPinned: true,
    },
    new Date('2026-01-01T00:00:00.000Z'),
  );
  const withBookmark = reduceWorkspace(snapshot, { type: 'bookmark.upsert', bookmark });
  const document = createWorkspaceExportDocument(withBookmark);
  const parsed = parseWorkspaceExportDocument(document);

  assert.equal(parsed.version, WORKSPACE_EXPORT_VERSION);
  assert.equal(parsed.boxes.length, 20);
  assert.equal(parsed.boxes[0].id, 'default-kanban');
  assert.equal(parsed.boxes[0].customTitle, 'Priority flow');
  assert.equal(parsed.boxes[1].templateId, 'kanban');
  assert.equal(parsed.bookmarks[0].id, 'bookmark-export');
});

test('default workspace page boxes can be added to legacy snapshots without replacing user boxes', () => {
  const snapshot = reduceWorkspace(createInitialWorkspaceSnapshot(), {
    type: 'workspace.replaceBoxes',
    boxes: [
      {
        id: 'legacy-inbox',
        customTitle: 'Legacy inbox',
        templateId: 'inbox',
        templateState: {},
        bounds: { x: 0, y: 0, width: 320, height: 360 },
        isLocked: false,
        isCollapsed: false,
        isMinimized: false,
        layout: 'list',
        zIndex: 1,
        items: [],
      } satisfies WorkspaceBoxWithItems,
    ],
  });
  const ensured = ensureDefaultWorkspacePageBoxes(snapshot);

  assert.equal(ensured.boxesById['legacy-inbox']?.customTitle, 'Legacy inbox');
  assert.equal(
    Object.values(ensured.boxesById).filter((box) => box.templateId === 'kanban').length,
    4,
  );
  assert.equal(
    Object.values(ensured.boxesById).filter((box) => box.templateId === 'inbox').length,
    2,
  );
  assert.ok(ensured.boxesById['default-launcher-tools']);
});

test('box.layoutPage stores masonry column and order slots', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const nextSnapshot = reduceWorkspace(snapshot, {
    type: 'box.layoutPage',
    positions: [
      { boxId: 'default-kanban', columnIndex: 2, orderIndex: 1 },
      { boxId: 'default-kanban-sprint', columnIndex: 0, orderIndex: 0 },
    ],
  });

  assert.deepEqual(nextSnapshot.boxViewStatesById['default-kanban'].bounds, {
    ...snapshot.boxViewStatesById['default-kanban'].bounds,
    x: 2,
    y: 1,
  });
  assert.deepEqual(nextSnapshot.boxViewStatesById['default-kanban-sprint'].bounds, {
    ...snapshot.boxViewStatesById['default-kanban-sprint'].bounds,
    x: 0,
    y: 0,
  });
});

test('workspace snapshot parser accepts current schema payloads', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const parsed = parseWorkspaceSnapshot(snapshot);

  assert.ok(parsed);
  assert.equal(parsed?.schemaVersion, WORKSPACE_SCHEMA_VERSION);
  assert.deepEqual(parsed?.bookmarksById, {});
  assert.equal(parseWorkspaceSnapshot({ version: 2, boxes: [] }), null);
});
