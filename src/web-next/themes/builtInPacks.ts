/**
 * Official built-in Theme Packs — loaded from on-disk documents, not authored in TS.
 *
 * Source files (same format as user packs):
 *   themes/builtin/{id}/theme.cardo-theme.json
 *
 * Vite bundles them via import.meta.glob; Runtime never invents palettes in code.
 * User packs use the same document schema under %DATA%/themes (see themePaths + README).
 */

import {
  OFFICIAL_BUILT_IN_THEME_IDS,
  themePackSchema,
  type ThemePack,
} from '../../core/contracts/themePack';
import { parseThemePackJson } from '../../core/contracts/themePackIO';
import { OFFICIAL_DEFAULT_THEME_ID } from './themePaths';

export { OFFICIAL_DEFAULT_THEME_ID };

export const BUILT_IN_THEME_IDS = OFFICIAL_BUILT_IN_THEME_IDS;

// Eager JSON modules from repo themes/builtin/{id}/theme.cardo-theme.json
const builtinThemeModules = import.meta.glob('../../../themes/builtin/*/theme.cardo-theme.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

function loadBuiltInThemePacks(): ThemePack[] {
  const byId = new Map<string, ThemePack>();

  for (const [modulePath, json] of Object.entries(builtinThemeModules)) {
    let pack: ThemePack;
    try {
      pack = themePackSchema.parse(parseThemePackJson(json));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error('Invalid built-in theme at ' + modulePath + ': ' + message);
    }

    if (!OFFICIAL_BUILT_IN_THEME_IDS.has(pack.id)) {
      throw new Error(
        'Built-in theme file ' +
          modulePath +
          ' has id "' +
          pack.id +
          '" which is not in OFFICIAL_BUILT_IN_THEME_IDS.',
      );
    }
    if (byId.has(pack.id)) {
      throw new Error('Duplicate built-in theme id "' + pack.id + '" from ' + modulePath + '.');
    }
    byId.set(pack.id, pack);
  }

  const missing = [...OFFICIAL_BUILT_IN_THEME_IDS].filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(
      'Missing built-in theme pack files for official ids: ' +
        missing.join(', ') +
        '. Expected under themes/builtin/{id}/theme.cardo-theme.json.',
    );
  }

  // Stable product order: classic first, then remaining official ids.
  const order = [...OFFICIAL_BUILT_IN_THEME_IDS];
  return order.map((id) => byId.get(id)!);
}

/** Shipped official packs. Parsed once at module load from JSON documents. */
export const BUILT_IN_THEME_PACKS: ThemePack[] = loadBuiltInThemePacks();

if (!BUILT_IN_THEME_PACKS.some((pack) => pack.id === OFFICIAL_DEFAULT_THEME_ID)) {
  throw new Error('Default theme "' + OFFICIAL_DEFAULT_THEME_ID + '" is not among built-in packs.');
}
