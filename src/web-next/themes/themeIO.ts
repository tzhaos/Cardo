import {
  MAX_THEME_PACK_JSON_BYTES,
  OFFICIAL_BUILT_IN_THEME_IDS,
  type ThemePack,
} from '../../core/contracts/themePack';
import {
  createThemePackDocument,
  parseThemePackDocumentText,
  serializeThemePackDocument,
} from '../../core/contracts/themePackIO';
import { getThemePack, registerThemePack, unregisterImportedThemePack } from './themeRegistry';

export {
  createThemePackDocument,
  parseThemePackDocumentText,
  serializeThemePackDocument,
};

export async function parseThemePackImportFile(file: File): Promise<ThemePack> {
  if (file.size > MAX_THEME_PACK_JSON_BYTES) {
    throw new Error('Theme pack file is too large.');
  }
  return parseThemePackDocumentText(await file.text());
}

/**
 * Register an imported pack. Official built-in ids cannot be overwritten —
 * they ship as files under themes/builtin/ and stay product-owned.
 */
export function importThemePackIntoRegistry(pack: ThemePack): ThemePack {
  if (OFFICIAL_BUILT_IN_THEME_IDS.has(pack.id)) {
    throw new Error(
      `Cannot overwrite official theme pack "${pack.id}". Choose a different id.`,
    );
  }
  registerThemePack(pack);
  return pack;
}

export function exportThemePackById(themeId: string): string {
  return serializeThemePackDocument(getThemePack(themeId));
}

export function removeImportedThemePack(themeId: string): void {
  if (OFFICIAL_BUILT_IN_THEME_IDS.has(themeId)) {
    throw new Error(`Cannot remove official theme pack "${themeId}".`);
  }
  unregisterImportedThemePack(themeId);
}
