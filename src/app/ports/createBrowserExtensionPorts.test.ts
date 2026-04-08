import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserExtensionPorts } from './createBrowserExtensionPorts';

test('createBrowserExtensionPorts returns a full port bundle', () => {
  const ports = createBrowserExtensionPorts();
  assert.ok(ports.workspaceStorage?.getItem);
  assert.ok(ports.clipboard?.readText);
  assert.ok(ports.fileExport?.downloadJson);
  assert.ok(ports.fileImport?.readText);
  assert.ok(ports.tabs?.openUrl);
  assert.ok(ports.runtimeDocument?.setTheme);
  assert.ok(ports.localResource?.requestOpen);
});
