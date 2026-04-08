import assert from 'node:assert/strict';
import test from 'node:test';
import { createExternalDraftFromDataTransfer } from './createExternalDraftFromDataTransfer';

function createTransferForEntry(
  entry:
    | { isDirectory: true; name: string }
    | { isDirectory: false; name: string; fileName: string },
) {
  const fileName = 'fileName' in entry ? entry.fileName : null;

  return {
    items: [
      {
        kind: 'file',
        webkitGetAsEntry: () =>
          entry.isDirectory
            ? { isDirectory: true, name: entry.name }
            : { isDirectory: false, name: entry.name },
        getAsFile: () => (fileName ? ({ name: fileName } as File) : null),
      },
    ],
  } as unknown as DataTransfer;
}

test('createExternalDraftFromDataTransfer creates folder drafts from directory drops', () => {
  const draft = createExternalDraftFromDataTransfer(
    createTransferForEntry({ isDirectory: true, name: 'ProjectAssets' }),
  );

  assert.deepEqual(draft, {
    type: 'folder',
    title: 'ProjectAssets',
    content: '',
  });
});

test('createExternalDraftFromDataTransfer creates file drafts from file drops', () => {
  const draft = createExternalDraftFromDataTransfer(
    createTransferForEntry({ isDirectory: false, name: 'report.txt', fileName: 'report.txt' }),
  );

  assert.deepEqual(draft, {
    type: 'file',
    title: 'report.txt',
    content: '',
  });
});
