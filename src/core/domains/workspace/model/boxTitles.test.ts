import assert from 'node:assert/strict';
import test from 'node:test';
import { getBoxDisplayTitle } from './boxTitles';

test('getBoxDisplayTitle returns custom title when set', () => {
  const t = (key: string) => key;
  assert.equal(getBoxDisplayTitle({ customTitle: 'My Box' }, t), 'My Box');
});

test('getBoxDisplayTitle trims custom title whitespace', () => {
  const t = (key: string) => key;
  assert.equal(getBoxDisplayTitle({ customTitle: '  Trimmed  ' }, t), 'Trimmed');
});

test('getBoxDisplayTitle falls back to translated message key', () => {
  const t = (key: string) => {
    const messages: Record<string, string> = {
      'box.folders': 'Folders',
      'box.new': 'New Box',
    };
    return messages[key] || key;
  };

  assert.equal(getBoxDisplayTitle({ customTitle: null }, t), 'New Box');
});

test('getBoxDisplayTitle prefers custom title over fallback', () => {
  const t = () => 'New Box';
  assert.equal(getBoxDisplayTitle({ customTitle: 'Custom' }, t), 'Custom');
});
