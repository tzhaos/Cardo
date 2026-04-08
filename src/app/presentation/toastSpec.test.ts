import test from 'node:test';
import assert from 'node:assert/strict';
import type { MessageKey } from '../../domains/i18n/model/messages';
import type { TranslationParams } from '../../domains/i18n/services/translate';
import { resolveToastParamValues } from './toastSpec';

const t = (key: MessageKey, params?: TranslationParams) => {
  if (params && Object.keys(params).length > 0) {
    return `${key}:${JSON.stringify(params)}`;
  }
  return key;
};

test('resolveToastParamValues resolves nested i18n keys', () => {
  const resolved = resolveToastParamValues(t, {
    type: { i18nKey: 'itemType.note' },
    box: 'Box A',
  });
  assert.ok(resolved);
  assert.equal(resolved.type, 'itemType.note');
  assert.equal(resolved.box, 'Box A');
});

test('resolveToastParamValues returns undefined for missing params', () => {
  assert.equal(resolveToastParamValues(t, undefined), undefined);
});
