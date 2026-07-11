/**
 * Shared Theme Pack parse / serialize (client import + Runtime disk scan).
 * Source of truth for on-disk document shape is themePackDocumentSchema.
 */

import {
  MAX_THEME_PACK_JSON_BYTES,
  THEME_PACK_DOCUMENT_FORMAT,
  THEME_PACK_DOCUMENT_VERSION,
  themePackDocumentSchema,
  themePackSchema,
  type ThemePack,
  type ThemePackDocument,
} from './themePack';

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

/**
 * Parse a JSON value that is either a Theme Pack document envelope or a bare pack.
 * Throws on invalid input.
 */
export function parseThemePackJson(json: unknown): ThemePack {
  const asDocument = themePackDocumentSchema.safeParse(json);
  if (asDocument.success) return asDocument.data.pack;
  const asPack = themePackSchema.safeParse(json);
  if (asPack.success) return asPack.data;
  throw new Error('Theme pack failed validation and was rejected.');
}

/**
 * Parse UTF-8 file text. Throws with a short message on size / JSON / schema errors.
 */
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
  return parseThemePackJson(json);
}

/** Soft parse for scanners: invalid files return null instead of throwing. */
export function tryParseThemePackDocumentText(text: string): ThemePack | null {
  try {
    return parseThemePackDocumentText(text);
  } catch {
    return null;
  }
}
