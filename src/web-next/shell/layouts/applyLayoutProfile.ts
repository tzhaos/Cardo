import type { LayoutProfileId } from '../../../core/contracts/layoutProfile';
import { DEFAULT_LAYOUT_PROFILE_ID } from '../../../core/contracts/layoutProfile';

/**
 * Apply classic shell markers on the document root (and app root if present).
 * Product chrome is always visible — layout is forced classic.
 */
export function applyLayoutProfile(
  root: HTMLElement,
  _layoutProfileId: LayoutProfileId = DEFAULT_LAYOUT_PROFILE_ID,
) {
  const layoutProfileId = DEFAULT_LAYOUT_PROFILE_ID;
  root.dataset.layoutProfile = layoutProfileId;
  root.setAttribute('data-layout-profile', layoutProfileId);
  root.dataset.cardoRoot = '';
  if (!root.hasAttribute('data-cardo-root')) {
    root.setAttribute('data-cardo-root', '');
  }

  delete root.dataset.chromeReveal;
  root.removeAttribute('data-chrome-reveal');

  const appNode = root.querySelector?.('.cardo-app');
  const app = appNode instanceof HTMLElement ? appNode : null;
  if (app) {
    app.dataset.layoutProfile = layoutProfileId;
    app.setAttribute('data-layout-profile', layoutProfileId);
    delete app.dataset.chromeReveal;
    app.removeAttribute('data-chrome-reveal');
  }

  // Clear any leftover floating/zen visibility markers from older builds.
  for (const el of document.querySelectorAll<HTMLElement>('[data-float-visible]')) {
    delete el.dataset.floatVisible;
    el.removeAttribute('data-float-visible');
  }
}
