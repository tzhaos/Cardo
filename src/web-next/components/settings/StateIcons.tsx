import { Moon, Sun } from 'lucide-react';
import type { WebNextColorMode } from '../../themes/themeRegistry';

/**
 * Dual-glyph color-mode affordance for settings rows.
 * Primary glyph top-left; secondary bottom-right muted.
 * CSS only — no Motion scale (scale softens glyphs on compositor layers).
 */
export function ColorModeStateIcon({ colorMode }: { colorMode: WebNextColorMode }) {
  const lightPrimary = colorMode === 'light';

  return (
    <span
      className={[
        'cardo-theme-state-icon',
        lightPrimary ? 'cardo-state-icon-light' : 'cardo-state-icon-dark',
      ].join(' ')}
      aria-hidden="true"
    >
      <span className="cardo-theme-sun cardo-state-glyph">
        <Sun size={14} strokeWidth={2.25} />
      </span>
      <span className="cardo-theme-moon cardo-state-glyph">
        <Moon size={14} strokeWidth={2.25} />
      </span>
    </span>
  );
}
