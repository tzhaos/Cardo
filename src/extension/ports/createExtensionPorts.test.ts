import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtensionPorts } from './createExtensionPorts';

test('createExtensionPorts returns a full port bundle', () => {
  const ports = createExtensionPorts();
  assert.ok(ports.workspaceStorage?.getItem);
  assert.ok(ports.clipboard?.readText);
  assert.ok(ports.fileExport?.downloadJson);
  assert.ok(ports.fileExport?.downloadText);
  assert.ok(ports.fileImport?.readText);
  assert.ok(ports.tabs?.openUrl);
  assert.ok(ports.runtimeDocument?.setTheme);
  assert.ok(ports.localResource?.requestOpen);
});
