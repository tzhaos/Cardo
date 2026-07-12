import type { LayoutProfileId } from '../../../core/contracts/layoutProfile';
import { DEFAULT_LAYOUT_PROFILE_ID } from '../../../core/contracts/layoutProfile';

/**
 * Apply layout profile markers on the document root.
 * classic: identity (official Cardo shell).
 * floating: chrome auto-hide via CSS + data attribute (hover edge to reveal).
 * zen: chrome fully hidden; floating exit control only.
 */
export function applyLayoutProfile(
  root: HTMLElement,
  layoutProfileId: LayoutProfileId = DEFAULT_LAYOUT_PROFILE_ID,
) {
  root.dataset.layoutProfile = layoutProfileId;
  root.dataset.cardoRoot = '';
  if (!root.hasAttribute('data-cardo-root')) {
    root.setAttribute('data-cardo-root', '');
  }
}
