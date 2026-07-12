import { useEffect } from 'react';
import type { LayoutProfileId } from '../../../core/contracts/layoutProfile';

/** How far outside each chrome rect still counts as near. */
const NEAR_PX = 40;

const FLOATING_SELECTORS = [
  '.cardo-top-bar',
  '.cardo-history-controls',
  '.cardo-canvas-tools',
  '.cardo-bottom-shell',
] as const;

const ZEN_EXIT_SELECTOR = '.cardo-zen-exit';

/**
 * Floating layout: each chrome piece shows when the pointer is near it, hides when it leaves.
 * Zen layout: exit icon uses the same near → show / leave → hide behavior.
 */
export function useImmersiveChrome(layoutProfileId: LayoutProfileId) {
  useEffect(() => {
    const root = document.documentElement;
    delete root.dataset.chromeReveal;
    root.removeAttribute('data-chrome-reveal');

    if (layoutProfileId === 'classic') {
      clearFloatVisible([...FLOATING_SELECTORS, ZEN_EXIT_SELECTOR]);
      return;
    }

    const selectors =
      layoutProfileId === 'floating'
        ? [...FLOATING_SELECTORS]
        : layoutProfileId === 'zen'
          ? [ZEN_EXIT_SELECTOR]
          : [];

    if (selectors.length === 0) return;

    const onMove = (event: PointerEvent) => {
      const { clientX: x, clientY: y } = event;
      for (const selector of selectors) {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) continue;
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

    clearFloatVisible(selectors);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      clearFloatVisible(selectors);
    };
  }, [layoutProfileId]);
}

function clearFloatVisible(selectors: readonly string[]) {
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((node) => {
      const el = node as HTMLElement;
      delete el.dataset.floatVisible;
      el.removeAttribute('data-float-visible');
    });
  }
}
