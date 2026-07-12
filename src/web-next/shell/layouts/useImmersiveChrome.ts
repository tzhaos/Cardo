import { useEffect } from 'react';
import type { LayoutProfileId } from '../../../core/contracts/layoutProfile';

const EDGE_PX = 18;
const HIDE_DELAY_MS = 900;

/**
 * Floating profile: reveal shell chrome when the pointer approaches edges
 * or presses Alt+` (backtick). Classic/zen leave data-chrome-reveal unset
 * (zen stays fully hidden; exit is a dedicated floating control).
 */
export function useImmersiveChrome(layoutProfileId: LayoutProfileId) {
  useEffect(() => {
    const root = document.documentElement;
    if (layoutProfileId !== 'floating') {
      delete root.dataset.chromeReveal;
      return;
    }

    let hideTimer: number | null = null;
    let pinned = false;

    const reveal = () => {
      root.dataset.chromeReveal = 'true';
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const scheduleHide = () => {
      if (pinned) return;
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!pinned) delete root.dataset.chromeReveal;
        hideTimer = null;
      }, HIDE_DELAY_MS);
    };

    const onMove = (event: PointerEvent) => {
      const nearTop = event.clientY <= EDGE_PX;
      const nearBottom = event.clientY >= window.innerHeight - EDGE_PX;
      const nearLeft = event.clientX <= EDGE_PX;
      const overChrome = Boolean(
        (event.target as Element | null)?.closest?.(
          '.cardo-top-bar, .cardo-history-controls, .cardo-bottom-shell, .cardo-canvas-tools, .cardo-settings-window, .cardo-independent-menu, .cardo-zen-exit',
        ),
      );
      if (nearTop || nearBottom || nearLeft || overChrome) {
        reveal();
        if (overChrome) pinned = true;
      } else {
        pinned = false;
        scheduleHide();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === '`') {
        event.preventDefault();
        if (root.dataset.chromeReveal === 'true') {
          pinned = false;
          delete root.dataset.chromeReveal;
        } else {
          pinned = true;
          reveal();
        }
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    scheduleHide();

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKeyDown);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      delete root.dataset.chromeReveal;
    };
  }, [layoutProfileId]);
}
