import assert from 'node:assert/strict';
import test from 'node:test';
import { exportWorkspace } from './exportWorkspace';
import { fileExportPort } from '../ports/defaultPorts';

test('exportWorkspace calls fileExportPort with dated filename and valid JSON', (t) => {
  const mock = t.mock.method(fileExportPort, 'downloadJson', () => {});
  exportWorkspace('khaosbox-backup');

  assert.equal(mock.mock.callCount(), 1);

  const filename = mock.mock.calls[0].arguments[0] as string;
  const payload = mock.mock.calls[0].arguments[1] as string;
  assert.match(filename, /^khaosbox-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const parsed = JSON.parse(payload) as { version: number; boxes: unknown[] };
  assert.equal(parsed.version, 2);
  assert.ok(Array.isArray(parsed.boxes));
});
