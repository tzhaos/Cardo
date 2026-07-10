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

test('creates a canvas with 1.2 extra screen spans around the origin', () => {
  assert.deepEqual(createCanvasWorldBounds(viewport), {
    minX: -720,
    minY: -480,
    maxX: 1920,
    maxY: 1280,
    width: 2640,
    height: 1760,
  });
});

test('camera panning stops at the reduced canvas boundary', () => {
  assert.deepEqual(panCanvasCamera({ panX: 900, panY: -700 }, { x: 500, y: -500 }, viewport), {
    panX: 720,
    panY: -480,
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
    { x: 1600, y: -480, width: 320, height: 240 },
  );
});

test('limits box resizing without moving its top-left corner', () => {
  const bounds = createCanvasWorldBounds(viewport);

  assert.deepEqual(
    constrainBoxResizeToCanvas({ x: 1720, y: 1080, width: 500, height: 400 }, bounds, {
      width: 240,
      height: 170,
    }),
    { x: 1720, y: 1080, width: 200, height: 200 },
  );
});
