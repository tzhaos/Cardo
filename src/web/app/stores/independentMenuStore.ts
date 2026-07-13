/**
 * Geometry helpers for independent floating chrome.
 * The settings menu store was removed with floating SettingsWindow (PR10);
 * clampIndependentMenuPosition remains for unit tests and any future overlay math.
 */

export interface IndependentMenuPosition {
  x: number;
  y: number;
}

export interface IndependentMenuSize {
  width: number;
  height: number;
}

export function clampIndependentMenuPosition(
  position: IndependentMenuPosition,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 12,
) {
  const maximumX = Math.max(margin, viewport.width - size.width - margin);
  const maximumY = Math.max(margin, viewport.height - size.height - margin);

  // Integer CSS pixels — fractional left/top rasterizes the whole shell soft.
  return {
    x: Math.round(Math.min(Math.max(position.x, margin), maximumX)),
    y: Math.round(Math.min(Math.max(position.y, margin), maximumY)),
  };
}
