import { useEffect } from 'react';
import type { LayoutProfileId } from '../../../core/contracts/layoutProfile';

const EDGE_PX = 18;
const HIDE_DELAY_MS = 900;

/**
 * Floating profile: reveal shell chrome when the pointer approaches edges
 * or presses Alt+` (backtick). Settings / menus do not keep shell chrome pinned.
 */
export function useImmersiveChrome(layoutProfileId: LayoutProfileId) {
  useEffect(() => {
    const root = document.documentElement;
    if (layoutProfileId !== 'floating') {
      delete root.dataset.chromeReveal;
      root.removeAttribute('data-chrome-reveal');
      return;
    }

    let hideTimer: number | null = null;
    let pinned = false;

    const setReveal = (revealed: boolean) => {
      if (revealed) {
        root.dataset.chromeReveal = 'true';
        root.setAttribute('data-chrome-reveal', 'true');
      } else {
        delete root.dataset.chromeReveal;
        root.removeAttribute('data-chrome-reveal');
      }
    };

    const reveal = () => {
      setReveal(true);
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const scheduleHide = () => {
      if (pinned) return;
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!pinned) setReveal(false);
        hideTimer = null;
      }, HIDE_DELAY_MS);
    };

    const onMove = (event: PointerEvent) => {
      const nearTop = event.clientY <= EDGE_PX;
      const nearBottom = event.clientY >= window.innerHeight - EDGE_PX;
      const nearLeft = event.clientX <= EDGE_PX;
      // Only pin while pointer is over shell chrome — not settings/menus.
      const overShellChrome = Boolean(
        (event.target as Element | null)?.closest?.(
          '.cardo-top-bar, .cardo-history-controls, .cardo-bottom-shell, .cardo-canvas-tools, .cardo-immersive-edge',
        ),
      );
      if (nearTop || nearBottom || nearLeft || overShellChrome) {
        reveal();
        pinned = overShellChrome;
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
          setReveal(false);
        } else {
          pinned = true;
          reveal();
        }
      }
    };

    // Enter floating hidden so the mode change is obvious.
    setReveal(false);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKeyDown);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      delete root.dataset.chromeReveal;
      root.removeAttribute('data-chrome-reveal');
    };
  }, [layoutProfileId]);
}
