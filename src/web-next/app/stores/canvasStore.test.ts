import assert from 'node:assert/strict';
import test from 'node:test';
import { getPageCanvasState, useCanvasStore } from './canvasStore';

function resetCanvasStore() {
  useCanvasStore.setState({
    pages: {},
    viewportSize: { width: 0, height: 0 },
    interactionMode: 'idle',
    isPanModifierActive: false,
  });
}

test('keeps camera and lock state isolated between workspace pages', () => {
  resetCanvasStore();
  const actions = useCanvasStore.getState();
  actions.setViewportSize({ width: 1200, height: 800 });
  actions.panBy('page-a', { x: 180, y: -90 });
  actions.toggleLocked('page-a');

  const state = useCanvasStore.getState();
  assert.deepEqual(getPageCanvasState(state, 'page-a'), {
    camera: { panX: 180, panY: -90 },
    isLocked: true,
  });
  assert.deepEqual(getPageCanvasState(state, 'page-b'), {
    camera: { panX: 0, panY: 0 },
    isLocked: false,
  });
});

test('clamps existing page cameras when the viewport changes', () => {
  resetCanvasStore();
  const actions = useCanvasStore.getState();
  actions.setViewportSize({ width: 1200, height: 800 });
  actions.panBy('page-a', { x: 1000, y: 700 });
  actions.setViewportSize({ width: 600, height: 400 });

  assert.deepEqual(getPageCanvasState(useCanvasStore.getState(), 'page-a').camera, {
    panX: 600,
    panY: 400,
  });
});
