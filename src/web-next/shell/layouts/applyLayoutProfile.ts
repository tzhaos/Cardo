import type { LayoutProfileId } from '../../../core/contracts/layoutProfile';
import { DEFAULT_LAYOUT_PROFILE_ID } from '../../../core/contracts/layoutProfile';

/**
 * Apply layout profile markers on the document root (and app root if present).
 * classic: identity (official Cardo shell).
 * floating: chrome hidden until pointer nears each piece.
 * zen: chrome fully hidden; floating exit control only.
 */
export function applyLayoutProfile(
  root: HTMLElement,
  layoutProfileId: LayoutProfileId = DEFAULT_LAYOUT_PROFILE_ID,
) {
  root.dataset.layoutProfile = layoutProfileId;
  root.setAttribute('data-layout-profile', layoutProfileId);
  root.dataset.cardoRoot = '';
  if (!root.hasAttribute('data-cardo-root')) {
    root.setAttribute('data-cardo-root', '');
  }

  // Mirror on .cardo-app so rules match even if a host only scopes under the app node.
  const app = root.querySelector?.('.cardo-app') as HTMLElement | null;
  if (app) {
    app.dataset.layoutProfile = layoutProfileId;
    app.setAttribute('data-layout-profile', layoutProfileId);
  }

  if (layoutProfileId === 'classic') {
    delete root.dataset.chromeReveal;
    root.removeAttribute('data-chrome-reveal');
    if (app) {
      delete app.dataset.chromeReveal;
      app.removeAttribute('data-chrome-reveal');
    }
  } else if (layoutProfileId === 'zen') {
    // Zen never uses edge-reveal.
    delete root.dataset.chromeReveal;
    root.removeAttribute('data-chrome-reveal');
    if (app) {
      delete app.dataset.chromeReveal;
      app.removeAttribute('data-chrome-reveal');
    }
  } else if (layoutProfileId === 'floating') {
    // Start hidden so switching into floating is immediately visible.
    delete root.dataset.chromeReveal;
    root.removeAttribute('data-chrome-reveal');
    if (app) {
      delete app.dataset.chromeReveal;
      app.removeAttribute('data-chrome-reveal');
    }
  }
}
