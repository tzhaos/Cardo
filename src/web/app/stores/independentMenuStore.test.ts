import assert from 'node:assert/strict';
import test from 'node:test';
import { clampIndependentMenuPosition } from './independentMenuStore';

test('independent menus stay inside the viewport', () => {
  assert.deepEqual(
    clampIndependentMenuPosition(
      { x: -100, y: 900 },
      { width: 640, height: 430 },
      { width: 1280, height: 720 },
    ),
    { x: 12, y: 278 },
  );
});

test('independent menus retain valid positions', () => {
  assert.deepEqual(
    clampIndependentMenuPosition(
      { x: 320, y: 140 },
      { width: 640, height: 430 },
      { width: 1280, height: 720 },
    ),
    { x: 320, y: 140 },
  );
});
