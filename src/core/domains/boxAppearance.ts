import type { WorkspaceBoxIcon } from '../contracts/workspace';

/**
 * Product chrome is monochrome: all boxes use the same light-gray accent.
 * Custom accent colors are not supported.
 */
export const DEFAULT_BOX_ACCENT = '#c4c7cc';

/** @deprecated No color presets — product forbids custom accents. */
export const BOX_ACCENT_PRESETS = [DEFAULT_BOX_ACCENT] as const;

export const DEFAULT_BOX_ICON: WorkspaceBoxIcon = 'box';

/** Always the product default gray (ignores used accents). */
export function chooseAvailableBoxAccent(_usedAccents?: Iterable<string>) {
  return DEFAULT_BOX_ACCENT;
}
