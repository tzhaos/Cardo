import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PREFERENCES } from '../domains/preferences/model/preferences';
import { createWorkspaceSnapshot } from '../domains/workspace/model/createInitialWorkspaceSnapshot';
import type { WorkspaceBox } from '../domains/workspace/model/workspace';
import {
  createWorkspaceSyncDocument,
  parseWorkspaceSyncDocument,
  sanitizeSyncedPreferences,
} from './workspaceSyncDocument';

const BOX: WorkspaceBox = {
  id: 'box-1',
  customTitle: null,
  templateId: 'collection',
  templateState: {},
  bounds: { x: 10, y: 20, width: 320, height: 400 },
  isLocked: false,
  isCollapsed: false,
  isMinimized: false,
  layout: 'list',
  zIndex: 1,
};

test('createWorkspaceSyncDocument includes export document and synced preferences', () => {
  const document = createWorkspaceSyncDocument(
    createWorkspaceSnapshot([BOX]),
    { ...DEFAULT_PREFERENCES, theme: 'dark', webdavUsername: 'secret@example.com' },
    '2026-01-01T00:00:00.000Z',
  );

  assert.equal(document.version, 1);
  assert.equal(document.exportedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(document.workspace.boxes[0].id, 'box-1');
  assert.equal(document.preferences.theme, 'dark');
  assert.equal('webdavUsername' in document.preferences, false);
});

test('parseWorkspaceSyncDocument normalizes invalid preferences', () => {
  const document = parseWorkspaceSyncDocument(
    {
      version: 1,
      workspace: {
        version: 3,
        boxes: [{ id: BOX.id, customTitle: BOX.customTitle, itemIds: [] }],
        items: [],
        itemPlacementsByBoxId: { [BOX.id]: [] },
        boxViewStates: [{ boxId: BOX.id, ...BOX }],
      },
      preferences: {
        theme: 'invalid',
        locale: 'zh',
        fontFamily: 'invalid',
        fontSize: '16',
        accentMode: 'manual',
        accentColor: '#123456',
        recentAccentColors: ['#abcdef', 42, ''],
        transparencyEnabled: false,
      },
    },
    'fallback',
  );

  assert.equal(document.exportedAt, 'fallback');
  assert.equal(document.preferences.theme, DEFAULT_PREFERENCES.theme);
  assert.equal(document.preferences.locale, 'zh');
  assert.equal(document.preferences.fontFamily, DEFAULT_PREFERENCES.fontFamily);
  assert.equal(document.preferences.fontSize, '16');
  assert.deepEqual(document.preferences.recentAccentColors, ['#123456', '#abcdef']);
  assert.equal(document.preferences.transparencyEnabled, false);
});

test('sanitizeSyncedPreferences falls back for non-record input', () => {
  assert.deepEqual(sanitizeSyncedPreferences(null), {
    theme: DEFAULT_PREFERENCES.theme,
    locale: DEFAULT_PREFERENCES.locale,
    fontFamily: DEFAULT_PREFERENCES.fontFamily,
    fontSize: DEFAULT_PREFERENCES.fontSize,
    accentMode: DEFAULT_PREFERENCES.accentMode,
    accentColor: DEFAULT_PREFERENCES.accentColor,
    recentAccentColors: DEFAULT_PREFERENCES.recentAccentColors,
    transparencyEnabled: DEFAULT_PREFERENCES.transparencyEnabled,
  });
});
