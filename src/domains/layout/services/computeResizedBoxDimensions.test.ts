import assert from 'node:assert/strict';
import test from 'node:test';
import { computeResizedBoxDimensions } from './computeResizedBoxDimensions';

const defaultOptions = { minWidth: 200, minHeight: 150, grid: 20 };

test('computeResizedBoxDimensions applies mouse delta to starting size', () => {
  const result = computeResizedBoxDimensions(
    { clientX: 350, clientY: 450 },
    { clientX: 300, clientY: 400, width: 320, height: 400 },
    defaultOptions,
  );

  assert.equal(result.width, 380);
  assert.equal(result.height, 460);
});

test('computeResizedBoxDimensions enforces minimum dimensions then snaps to grid', () => {
  const result = computeResizedBoxDimensions(
    { clientX: 100, clientY: 100 },
    { clientX: 500, clientY: 500, width: 320, height: 400 },
    defaultOptions,
  );

  assert.equal(result.width, 200);
  assert.equal(result.height, 160);
});

test('computeResizedBoxDimensions snaps to grid', () => {
  const result = computeResizedBoxDimensions(
    { clientX: 313, clientY: 407 },
    { clientX: 300, clientY: 400, width: 320, height: 400 },
    defaultOptions,
  );

  assert.equal(result.width % 20, 0);
  assert.equal(result.height % 20, 0);
});

test('computeResizedBoxDimensions rounds to nearest grid line', () => {
  const result = computeResizedBoxDimensions(
    { clientX: 309, clientY: 409 },
    { clientX: 300, clientY: 400, width: 320, height: 400 },
    { minWidth: 200, minHeight: 150, grid: 20 },
  );

  assert.equal(result.width, 320);
  assert.equal(result.height, 400);
});

test('computeResizedBoxDimensions with grid=1 does not snap', () => {
  const result = computeResizedBoxDimensions(
    { clientX: 315, clientY: 415 },
    { clientX: 300, clientY: 400, width: 320, height: 400 },
    { minWidth: 200, minHeight: 150, grid: 1 },
  );

  assert.equal(result.width, 335);
  assert.equal(result.height, 415);
});
