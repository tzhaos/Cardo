import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clientPointToCanvasWorld,
  constrainBoxFrameToCanvas,
  constrainBoxResizeToCanvas,
  createCanvasWorldBounds,
  getCanvasViewportCenter,
  panCanvasCamera,
} from './canvasGeometry';

const viewport = { width: 1200, height: 800 };

test('creates a nine-screen canvas around the origin viewport', () => {
  assert.deepEqual(createCanvasWorldBounds(viewport), {
    minX: -1200,
    minY: -800,
    maxX: 2400,
    maxY: 1600,
    width: 3600,
    height: 2400,
  });
});

test('camera panning stops at the nine-screen canvas boundary', () => {
  assert.deepEqual(panCanvasCamera({ panX: 900, panY: -700 }, { x: 500, y: -500 }, viewport), {
    panX: 1200,
    panY: -800,
  });
});

test('converts client points into stable canvas world coordinates', () => {
  assert.deepEqual(
    clientPointToCanvasWorld(
      { clientX: 460, clientY: 290 },
      { left: 20, top: 40 },
      { panX: -300, panY: 120 },
    ),
    { x: 740, y: 130 },
  );
});

test('derives the visible world center from the camera', () => {
  assert.deepEqual(getCanvasViewportCenter({ panX: -300, panY: 120 }, viewport), {
    x: 900,
    y: 280,
  });
});

test('keeps box frames fully inside the canvas', () => {
  const bounds = createCanvasWorldBounds(viewport);

  assert.deepEqual(
    constrainBoxFrameToCanvas({ x: 2300, y: -900, width: 320, height: 240 }, bounds),
    { x: 2080, y: -800, width: 320, height: 240 },
  );
});

test('limits box resizing without moving its top-left corner', () => {
  const bounds = createCanvasWorldBounds(viewport);

  assert.deepEqual(
    constrainBoxResizeToCanvas({ x: 2200, y: 1400, width: 500, height: 400 }, bounds, {
      width: 240,
      height: 170,
    }),
    { x: 2200, y: 1400, width: 200, height: 200 },
  );
});
