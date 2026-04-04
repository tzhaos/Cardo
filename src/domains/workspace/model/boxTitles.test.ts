import assert from 'node:assert/strict';
import test from 'node:test';
import { getBoxTitleMessageKey, getBoxDisplayTitle } from './boxTitles';

test('getBoxTitleMessageKey returns correct keys for system boxes', () => {
  assert.equal(getBoxTitleMessageKey({ role: 'folders' }), 'box.folders');
  assert.equal(getBoxTitleMessageKey({ role: 'links' }), 'box.links');
  assert.equal(getBoxTitleMessageKey({ role: 'notes' }), 'box.notes');
});

test('getBoxTitleMessageKey returns "new" key for boxes without role', () => {
  assert.equal(getBoxTitleMessageKey({ role: null }), 'box.new');
});

test('getBoxDisplayTitle returns custom title when set', () => {
  const t = (key: string) => key;
  assert.equal(getBoxDisplayTitle({ customTitle: 'My Box', role: null }, t), 'My Box');
});

test('getBoxDisplayTitle trims custom title whitespace', () => {
  const t = (key: string) => key;
  assert.equal(getBoxDisplayTitle({ customTitle: '  Trimmed  ', role: null }, t), 'Trimmed');
});

test('getBoxDisplayTitle falls back to translated message key', () => {
  const t = (key: string) => {
    const messages: Record<string, string> = {
      'box.folders': 'Folders',
      'box.new': 'New Box',
    };
    return messages[key] || key;
  };

  assert.equal(getBoxDisplayTitle({ customTitle: null, role: 'folders' }, t), 'Folders');
  assert.equal(getBoxDisplayTitle({ customTitle: null, role: null }, t), 'New Box');
});

test('getBoxDisplayTitle prefers custom title over role-based fallback', () => {
  const t = () => 'Folders';
  assert.equal(getBoxDisplayTitle({ customTitle: 'Custom', role: 'folders' }, t), 'Custom');
});
