import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkspaceBox } from '../../workspace/model/workspace';
import { calculateSnap } from './calculateSnap';

function box(partial: Partial<WorkspaceBox> & Pick<WorkspaceBox, 'id'>): WorkspaceBox {
  return {
    role: null,
    customTitle: null,
    isLocked: false,
    isMinimized: false,
    layout: 'list',
    zIndex: 1,
    items: [],
    bounds: { x: 0, y: 0, width: 200, height: 200 },
    ...partial,
  };
}

test('calculateSnap snaps to viewport origin when close to zero', () => {
  const result = calculateSnap(4, 3, 100, 80, [], 'a');
  assert.equal(result.x, 0);
  assert.equal(result.y, 0);
  assert.equal(result.isSnapped, true);
});

test('calculateSnap aligns to another box left and top edges', () => {
  const others = [box({ id: 'other', bounds: { x: 200, y: 150, width: 220, height: 300 } })];
  const result = calculateSnap(203, 152, 100, 100, others, 'self');
  assert.equal(result.x, 200);
  assert.equal(result.y, 150);
  assert.equal(result.isSnapped, true);
});

test('calculateSnap skips minimized boxes', () => {
  const others = [
    box({
      id: 'min',
      isMinimized: true,
      bounds: { x: 5, y: 5, width: 200, height: 200 },
    }),
  ];
  const result = calculateSnap(4, 4, 100, 100, others, 'self');
  assert.equal(result.isSnapped, true);
  assert.equal(result.x, 0);
  assert.equal(result.y, 0);
});

test('calculateSnap rounds to grid when not edge-snapped', () => {
  const result = calculateSnap(33, 47, 100, 100, [], 'a');
  assert.equal(result.x, 40);
  assert.equal(result.y, 40);
  assert.equal(result.isSnapped, false);
});
