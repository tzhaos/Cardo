import { useEffect } from 'react';
import type { LayoutProfileId } from '../../../core/contracts/layoutProfile';

const HIDE_DELAY_MS = 700;
/** Extra pixels around each chrome resting rect that still counts as “near”. */
const PROXIMITY_PX = 36;

type ChromeSlot = 'top' | 'history' | 'tools' | 'bottom';

const SLOT_SELECTOR: Record<ChromeSlot, string> = {
  top: '.cardo-top-bar',
  history: '.cardo-history-controls',
  tools: '.cardo-canvas-tools',
  bottom: '.cardo-bottom-shell',
};

/**
 * Floating profile: each shell chrome piece stays hidden until the pointer
 * approaches that piece’s resting area (or rests on the revealed piece).
 * No whole-screen edge reveal.
 */
export function useImmersiveChrome(layoutProfileId: LayoutProfileId) {
  useEffect(() => {
    const root = document.documentElement;
    if (layoutProfileId !== 'floating') {
      clearAllFloatVisible();
      delete root.dataset.chromeReveal;
      root.removeAttribute('data-chrome-reveal');
      return;
    }

    // Global reveal flag unused in per-slot floating; keep clean.
    delete root.dataset.chromeReveal;
    root.removeAttribute('data-chrome-reveal');

    const hideTimers: Partial<Record<ChromeSlot, number>> = {};
    const pinned: Partial<Record<ChromeSlot, boolean>> = {};

    const setVisible = (slot: ChromeSlot, visible: boolean) => {
      const el = document.querySelector(SLOT_SELECTOR[slot]) as HTMLElement | null;
      if (!el) return;
      if (visible) {
        el.dataset.floatVisible = 'true';
        el.setAttribute('data-float-visible', 'true');
      } else {
        delete el.dataset.floatVisible;
        el.removeAttribute('data-float-visible');
      }
    };

    const reveal = (slot: ChromeSlot) => {
      setVisible(slot, true);
      const timer = hideTimers[slot];
      if (timer != null) {
        window.clearTimeout(timer);
        hideTimers[slot] = undefined;
      }
    };

    const scheduleHide = (slot: ChromeSlot) => {
      if (pinned[slot]) return;
      const existing = hideTimers[slot];
      if (existing != null) window.clearTimeout(existing);
      hideTimers[slot] = window.setTimeout(() => {
        if (!pinned[slot]) setVisible(slot, false);
        hideTimers[slot] = undefined;
      }, HIDE_DELAY_MS);
    };

    const onMove = (event: PointerEvent) => {
      const { clientX: x, clientY: y } = event;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const target = event.target as Element | null;

      for (const slot of Object.keys(SLOT_SELECTOR) as ChromeSlot[]) {
        if (!document.querySelector(SLOT_SELECTOR[slot])) continue;

        const overSelf = Boolean(target?.closest?.(SLOT_SELECTOR[slot]));
        const near = isNearSlot(slot, x, y, w, h) || overSelf;
        if (near) {
          reveal(slot);
          pinned[slot] = overSelf;
        } else {
          pinned[slot] = false;
          scheduleHide(slot);
        }
      }
    };

    clearAllFloatVisible();
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      for (const timer of Object.values(hideTimers)) {
        if (timer != null) window.clearTimeout(timer);
      }
      clearAllFloatVisible();
    };
  }, [layoutProfileId]);
}

function clearAllFloatVisible() {
  for (const selector of Object.values(SLOT_SELECTOR)) {
    document.querySelectorAll(selector).forEach((node) => {
      const el = node as HTMLElement;
      delete el.dataset.floatVisible;
      el.removeAttribute('data-float-visible');
    });
  }
}

/**
 * Approximate resting hit zones for each chrome piece.
 * Zones stay active while chrome is hidden so the user can “approach” them.
 */
function isNearSlot(
  slot: ChromeSlot,
  x: number,
  y: number,
  viewportW: number,
  viewportH: number,
): boolean {
  const p = PROXIMITY_PX;
  const desktop = document.querySelector('.cardo-app-desktop') != null;
  const theme = document.documentElement.dataset.cardoTheme ?? '';
  const fullWidthTop = theme === 'fluent' || theme === 'material';

  switch (slot) {
    case 'top': {
      const top = desktop ? (theme === 'swiftui' ? 50 : 40) : theme === 'swiftui' ? 10 : 24;
      const height = fullWidthTop ? 52 : 48;
      if (y < top - p || y > top + height + p) return false;
      if (fullWidthTop) return true;
      // Centered pill: approach near horizontal center.
      const half = Math.min(320, viewportW * 0.42);
      return Math.abs(x - viewportW / 2) <= half + p;
    }
    case 'history': {
      const top = desktop ? 64 : 24;
      const left = 24;
      const size = 96;
      return x >= left - p && x <= left + size + p && y >= top - p && y <= top + size + p;
    }
    case 'tools': {
      const top = desktop ? 64 : 24;
      const size = 120;
      return (
        x >= viewportW - size - p &&
        x <= viewportW + p &&
        y >= top - p &&
        y <= top + size + p
      );
    }
    case 'bottom': {
      const bottom = 32;
      const height = 56;
      if (y < viewportH - bottom - height - p || y > viewportH + p) return false;
      const half = Math.min(280, viewportW * 0.4);
      return Math.abs(x - viewportW / 2) <= half + p;
    }
    default:
      return false;
  }
}
