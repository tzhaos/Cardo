import {
  MAX_THEME_PACK_JSON_BYTES,
  THEME_PACK_DOCUMENT_FORMAT,
  THEME_PACK_DOCUMENT_VERSION,
  themePackDocumentSchema,
  themePackSchema,
  type ThemePack,
  type ThemePackDocument,
} from '../../core/contracts/themePack';
import { BUILT_IN_THEME_IDS } from './builtInPacks';
import { getThemePack, registerThemePack, unregisterImportedThemePack } from './themeRegistry';

export function createThemePackDocument(pack: ThemePack): ThemePackDocument {
  return {
    format: THEME_PACK_DOCUMENT_FORMAT,
    version: THEME_PACK_DOCUMENT_VERSION,
    pack: themePackSchema.parse(pack),
  };
}

export function serializeThemePackDocument(pack: ThemePack): string {
  return `${JSON.stringify(createThemePackDocument(pack), null, 2)}\n`;
}

export function parseThemePackDocumentText(text: string): ThemePack {
  if (text.length > MAX_THEME_PACK_JSON_BYTES) {
    throw new Error('Theme pack file is too large.');
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Theme pack file is not valid JSON.');
  }

  // Accept either the document envelope or a bare ThemePack object.
  const asDocument = themePackDocumentSchema.safeParse(json);
  if (asDocument.success) {
    return asDocument.data.pack;
  }
  const asPack = themePackSchema.safeParse(json);
  if (asPack.success) {
    return asPack.data;
  }
  throw new Error('Theme pack failed validation and was rejected.');
}

export async function parseThemePackImportFile(file: File): Promise<ThemePack> {
  if (file.size > MAX_THEME_PACK_JSON_BYTES) {
    throw new Error('Theme pack file is too large.');
  }
  return parseThemePackDocumentText(await file.text());
}

/**
 * Register an imported pack. Built-in official ids cannot be overwritten —
 * that keeps classic/ocean/orchid frozen as product presets.
 */
export function importThemePackIntoRegistry(pack: ThemePack): ThemePack {
  const parsed = themePackSchema.parse(pack);
  if (BUILT_IN_THEME_IDS.has(parsed.id)) {
    throw new Error(
      `Cannot overwrite official theme pack "${parsed.id}". Choose a different id.`,
    );
  }
  registerThemePack(parsed);
  return parsed;
}

export function exportThemePackById(themeId: string): string {
  return serializeThemePackDocument(getThemePack(themeId));
}

export function removeImportedThemePack(themeId: string): void {
  if (BUILT_IN_THEME_IDS.has(themeId)) {
    throw new Error(`Cannot remove official theme pack "${themeId}".`);
  }
  unregisterImportedThemePack(themeId);
}
