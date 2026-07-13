import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DomainCommandError } from './domainError';

describe('DomainCommandError', () => {
  it('maps not_found to 404 by default', () => {
    const error = new DomainCommandError('not_found', 'missing');
    assert.equal(error.code, 'not_found');
    assert.equal(error.httpStatus, 404);
    assert.equal(error.message, 'missing');
    assert.equal(error.name, 'DomainCommandError');
  });

  it('maps conflict to 409 by default', () => {
    const error = new DomainCommandError('conflict', 'already exists');
    assert.equal(error.code, 'conflict');
    assert.equal(error.httpStatus, 409);
  });

  it('maps precondition_failed to 400 by default', () => {
    const error = new DomainCommandError('precondition_failed', 'not allowed');
    assert.equal(error.code, 'precondition_failed');
    assert.equal(error.httpStatus, 400);
  });

  it('maps invalid_command to 400 by default', () => {
    const error = new DomainCommandError('invalid_command', 'bad payload');
    assert.equal(error.code, 'invalid_command');
    assert.equal(error.httpStatus, 400);
  });

  it('allows explicit httpStatus override', () => {
    const error = new DomainCommandError('not_found', 'gone', 410);
    assert.equal(error.httpStatus, 410);
  });
});
