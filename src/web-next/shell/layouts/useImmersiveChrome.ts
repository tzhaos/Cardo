import { useEffect } from 'react';
import type { LayoutProfileId } from '../../../core/contracts/layoutProfile';

/** How far outside each chrome rect still counts as near. */
const NEAR_PX = 40;

const CHROME_SELECTORS = [
  '.cardo-top-bar',
  '.cardo-history-controls',
  '.cardo-canvas-tools',
  '.cardo-bottom-shell',
] as const;

/**
 * Floating: each chrome piece is hidden until the pointer is near it;
 * leaves the near zone → hide immediately. No delays, no edge bands.
 */
export function useImmersiveChrome(layoutProfileId: LayoutProfileId) {
  useEffect(() => {
    const root = document.documentElement;
    delete root.dataset.chromeReveal;
    root.removeAttribute('data-chrome-reveal');

    if (layoutProfileId !== 'floating') {
      clearFloatVisible();
      return;
    }

    const onMove = (event: PointerEvent) => {
      const { clientX: x, clientY: y } = event;
      for (const selector of CHROME_SELECTORS) {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) continue;
        // Geometry stays in resting place (CSS does not shift hidden chrome).
        const rect = el.getBoundingClientRect();
        const near =
          x >= rect.left - NEAR_PX &&
          x <= rect.right + NEAR_PX &&
          y >= rect.top - NEAR_PX &&
          y <= rect.bottom + NEAR_PX;
        if (near) {
          el.dataset.floatVisible = 'true';
          el.setAttribute('data-float-visible', 'true');
        } else {
          delete el.dataset.floatVisible;
          el.removeAttribute('data-float-visible');
        }
      }
    };

    clearFloatVisible();
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      clearFloatVisible();
    };
  }, [layoutProfileId]);
}

function clearFloatVisible() {
  for (const selector of CHROME_SELECTORS) {
    document.querySelectorAll(selector).forEach((node) => {
      const el = node as HTMLElement;
      delete el.dataset.floatVisible;
      el.removeAttribute('data-float-visible');
    });
  }
}
