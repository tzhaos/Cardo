import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtensionPorts } from './createExtensionPorts';

test('createExtensionPorts returns a full port bundle', () => {
  const ports = createExtensionPorts();
  assert.ok(ports.database?.execute);
  assert.ok(ports.clipboard?.readText);
  assert.ok(ports.fileExport?.downloadJson);
  assert.ok(ports.fileExport?.downloadText);
  assert.ok(ports.tabs?.openUrl);
  assert.ok(ports.localResource?.requestOpen);
  assert.ok(ports.websiteIcons?.resolve);
});

test('createExtensionPorts hard-disables OPFS database execute (PR5)', async () => {
  const ports = createExtensionPorts();
  await assert.rejects(
    () => ports.database.execute({ method: 'all', sql: 'select 1', params: [] }),
    /hard-disabled|RuntimeClient/i,
  );
});
