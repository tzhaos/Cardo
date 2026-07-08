import assert from 'node:assert/strict';
import test from 'node:test';
import { WORKSPACE_EXPORT_VERSION } from '../../../core/domains/workspace/model/workspace';
import { exportWorkspace } from './exportWorkspace';
import { fileExportPort } from '../ports/defaultPorts';

test('exportWorkspace calls fileExportPort with dated filename and valid JSON', (t) => {
  const mock = t.mock.method(fileExportPort, 'downloadJson', () => {});
  exportWorkspace('khaosbox-backup');

  assert.equal(mock.mock.callCount(), 1);

  const filename = mock.mock.calls[0].arguments[0] as string;
  const payload = mock.mock.calls[0].arguments[1] as string;
  assert.match(filename, /^khaosbox-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const parsed = JSON.parse(payload) as {
    version: number;
    boxes: Array<{ templateId?: string }>;
    items: unknown[];
  };
  assert.equal(parsed.version, WORKSPACE_EXPORT_VERSION);
  assert.ok(Array.isArray(parsed.boxes));
  assert.ok(Array.isArray(parsed.items));
  assert.equal(parsed.boxes.length, 10);
  assert.equal(parsed.boxes.some((box) => box.templateId === 'inbox'), false);
  assert.equal(parsed.boxes.some((box) => box.templateId === 'kanban'), false);
  assert.equal(parsed.boxes.some((box) => box.templateId === 'project-board'), false);
  assert.equal(parsed.boxes.some((box) => box.templateId === 'daily-desk'), false);
});
