/** Default size for user-created boxes (toolbar, canvas context menu, etc.). */
export const DEFAULT_BOX_WIDTH = 400;
export const DEFAULT_BOX_HEIGHT = 320;

/**
 * First-run welcome box: large enough for several clipboard tips.
 * Positioned for a typical first paint viewport (see WELCOME_VIEWPORT_*).
 */
export const WELCOME_BOX_WIDTH = 480;
export const WELCOME_BOX_HEIGHT = 520;

/** Assumed viewport when placing the seed welcome box (no client metrics at seed time). */
export const WELCOME_VIEWPORT_WIDTH = 1280;
export const WELCOME_VIEWPORT_HEIGHT = 800;

export function createDefaultBoxFrameCenteredAt(point: { x: number; y: number }) {
  return {
    x: Math.round(point.x - DEFAULT_BOX_WIDTH / 2),
    y: Math.round(point.y - DEFAULT_BOX_HEIGHT / 2),
    width: DEFAULT_BOX_WIDTH,
    height: DEFAULT_BOX_HEIGHT,
  };
}

export function createWelcomeBoxFrame() {
  return {
    x: Math.round((WELCOME_VIEWPORT_WIDTH - WELCOME_BOX_WIDTH) / 2),
    y: Math.round((WELCOME_VIEWPORT_HEIGHT - WELCOME_BOX_HEIGHT) / 2),
    width: WELCOME_BOX_WIDTH,
    height: WELCOME_BOX_HEIGHT,
  };
}
