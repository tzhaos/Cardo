import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkspaceBox } from '../../workspace/model/workspace';
import { computeBoxDragFrame } from './computeBoxDragFrame';

function box(partial: Partial<WorkspaceBox> & Pick<WorkspaceBox, 'id'>): WorkspaceBox {
  return {
    customTitle: null,
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: 'list',
    zIndex: 1,
    bounds: { x: 80, y: 80, width: 200, height: 140 },
    ...partial,
    templateId: partial.templateId ?? 'collection',
    templateState: partial.templateState ?? {},
  };
}

test('computeBoxDragFrame constrains boxes to side and top layout bounds', () => {
  const currentBox = box({ id: 'self' });
  const result = computeBoxDragFrame(
    { clientX: -200, clientY: -200 },
    { clientX: 0, clientY: 0, initialBoxX: 80, initialBoxY: 80 },
    currentBox,
    [currentBox],
    { minX: 28, maxX: 500, minY: 0 },
  );

  assert.equal(result.newX, 28);
  assert.equal(result.newY, 0);
  assert.equal(result.snap.x, 28);
  assert.equal(result.snap.y, 0);
});

test('computeBoxDragFrame has no bottom layout bound', () => {
  const currentBox = box({ id: 'self' });
  const result = computeBoxDragFrame(
    { clientX: 620, clientY: 1460 },
    { clientX: 0, clientY: 0, initialBoxX: 80, initialBoxY: 80 },
    currentBox,
    [currentBox],
    { minX: 28, maxX: 500, minY: 0 },
  );

  assert.equal(result.newX, 500);
  assert.equal(result.newY, 1540);
  assert.equal(result.snap.x, 500);
  assert.equal(result.snap.y, 1540);
});
