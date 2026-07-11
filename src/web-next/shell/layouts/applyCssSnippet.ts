import {
  validateCssSnippet,
  wrapCssSnippetForRoot,
} from '../../../core/contracts/cssSnippet';
import { getThemePack } from '../../themes/themeRegistry';

const STYLE_ELEMENT_ID = 'cardo-user-css-snippet';

/**
 * Inject validated CSS snippet into the document.
 * Combines optional theme-pack snippet + user snippet when enabled.
 * Failures refuse injection (no partial unsafe CSS).
 */
export function applyCssSnippet(options: {
  themeId: string;
  userSnippet: string;
  userSnippetEnabled: boolean;
}): { applied: boolean; errors: string[] } {
  const style = ensureStyleElement();
  const chunks: string[] = [];
  const errors: string[] = [];

  const pack = getThemePack(options.themeId);
  if (pack.cssSnippet?.trim()) {
    const packResult = validateCssSnippet(pack.cssSnippet);
    if (packResult.ok && packResult.sanitized.trim()) {
      chunks.push(wrapCssSnippetForRoot(packResult.sanitized));
    } else {
      errors.push(...packResult.errors.map((message) => `Theme pack snippet: ${message}`));
    }
  }

  if (options.userSnippetEnabled && options.userSnippet.trim()) {
    const userResult = validateCssSnippet(options.userSnippet);
    if (userResult.ok && userResult.sanitized.trim()) {
      chunks.push(wrapCssSnippetForRoot(userResult.sanitized));
    } else {
      errors.push(...userResult.errors.map((message) => `User snippet: ${message}`));
    }
  }

  if (errors.length > 0) {
    style.textContent = '';
    return { applied: false, errors };
  }

  style.textContent = chunks.join('\n\n');
  return { applied: chunks.length > 0, errors: [] };
}

function ensureStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.setAttribute('data-cardo-snippet', 'true');
  document.head.appendChild(style);
  return style;
}

export function clearCssSnippet() {
  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing) existing.textContent = '';
}
