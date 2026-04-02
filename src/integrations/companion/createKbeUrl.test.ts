import assert from 'node:assert/strict';
import test from 'node:test';
import { createKbeUrl } from './createKbeUrl';

test('createKbeUrl encodes drive-letter folder paths', () => {
  assert.equal(
    createKbeUrl('V:\\Shared\\Chinese Folder'),
    'kbe:V:/Shared/Chinese%20Folder',
  );
});

test('createKbeUrl encodes UNC folder paths as opaque kbe payloads', () => {
  assert.equal(
    createKbeUrl('\\\\server\\share\\Driver_Package\\win_signed'),
    'kbe:%2F%2Fserver%2Fshare%2FDriver_Package%2Fwin_signed',
  );
});

test('createKbeUrl preserves nested file URIs for parser normalization', () => {
  assert.equal(
    createKbeUrl('file:///C:/Work/Specs.pdf'),
    'kbe:file:///C:/Work/Specs.pdf',
  );
});
