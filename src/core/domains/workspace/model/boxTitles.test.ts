import assert from 'node:assert/strict';
import test from 'node:test';
import { getBoxDisplayTitle } from './boxTitles';

test('getBoxDisplayTitle returns custom title when set', () => {
  const t = (key: string) => key;
  assert.equal(
    getBoxDisplayTitle({ customTitle: 'My Box', templateId: 'collection' }, t),
    'My Box',
  );
});

test('getBoxDisplayTitle trims custom title whitespace', () => {
  const t = (key: string) => key;
  assert.equal(
    getBoxDisplayTitle({ customTitle: '  Trimmed  ', templateId: 'collection' }, t),
    'Trimmed',
  );
});

test('getBoxDisplayTitle falls back to template title', () => {
  const t = (key: string) => {
    const messages: Record<string, string> = {
      'template.collection': 'Collection',
      'template.kanban': 'Kanban',
    };
    return messages[key] || key;
  };

  assert.equal(getBoxDisplayTitle({ customTitle: null, templateId: 'kanban' }, t), 'Kanban');
});

test('getBoxDisplayTitle prefers custom title over fallback', () => {
  const t = () => 'New Box';
  assert.equal(getBoxDisplayTitle({ customTitle: 'Custom', templateId: 'kanban' }, t), 'Custom');
});
