import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DATABASE_SCHEMA_VERSION } from './database/version';
import { assertRuntimeCompatible } from './runtimeCompatibility';

describe('assertRuntimeCompatible', () => {
  it('accepts equal schemaVersion', () => {
    const result = assertRuntimeCompatible({ schemaVersion: DATABASE_SCHEMA_VERSION });
    assert.deepEqual(result, { ok: true });
  });

  it('rejects older schemaVersion', () => {
    const result = assertRuntimeCompatible({ schemaVersion: DATABASE_SCHEMA_VERSION - 1 });
    assert.equal(result.ok, false);
    if (result.ok) {
      assert.fail('expected schema_mismatch');
    }
    assert.equal(result.code, 'schema_mismatch');
    assert.match(result.message, /schemaVersion/);
  });

  it('rejects newer schemaVersion', () => {
    const result = assertRuntimeCompatible({ schemaVersion: DATABASE_SCHEMA_VERSION + 1 });
    assert.equal(result.ok, false);
    if (result.ok) {
      assert.fail('expected schema_mismatch');
    }
    assert.equal(result.code, 'schema_mismatch');
  });

  it('fails when requireAppUi is true and servesAppUi is false', () => {
    const result = assertRuntimeCompatible({
      schemaVersion: DATABASE_SCHEMA_VERSION,
      requireAppUi: true,
      servesAppUi: false,
    });
    assert.equal(result.ok, false);
    if (result.ok) {
      assert.fail('expected app_ui_missing');
    }
    assert.equal(result.code, 'app_ui_missing');
    assert.match(result.message, /\/app UI/);
  });

  it('accepts requireAppUi when servesAppUi is true', () => {
    const result = assertRuntimeCompatible({
      schemaVersion: DATABASE_SCHEMA_VERSION,
      requireAppUi: true,
      servesAppUi: true,
    });
    assert.deepEqual(result, { ok: true });
  });

  it('does not require servesAppUi when requireAppUi is omitted', () => {
    const result = assertRuntimeCompatible({
      schemaVersion: DATABASE_SCHEMA_VERSION,
      servesAppUi: false,
    });
    assert.deepEqual(result, { ok: true });
  });
});
