/**
 * Shared Theme Pack parse / serialize (client import + Runtime disk scan).
 * Source of truth for on-disk document shape is themePackDocumentSchema.
 */

import {
  MAX_THEME_PACK_JSON_BYTES,
  THEME_PACK_DOCUMENT_FORMAT,
  THEME_PACK_DOCUMENT_VERSION,
  ensureThemePackShellColors,
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
 * Deep-clone JSON and fill missing `shell` colors on pack / document.pack
 * before strict schema parse (one-way load repair, not dual schema).
 */
function prepareThemePackJsonForParse(json: unknown): unknown {
  if (json === null || typeof json !== 'object') return json;
  let clone: unknown;
  try {
    clone = structuredClone(json);
  } catch {
    clone = JSON.parse(JSON.stringify(json)) as unknown;
  }
  if (clone === null || typeof clone !== 'object') return clone;
  const root = clone as Record<string, unknown>;
  if (
    root.format === THEME_PACK_DOCUMENT_FORMAT &&
    root.pack !== null &&
    typeof root.pack === 'object'
  ) {
    ensureThemePackShellColors(root.pack as Parameters<typeof ensureThemePackShellColors>[0]);
    return clone;
  }
  ensureThemePackShellColors(root as Parameters<typeof ensureThemePackShellColors>[0]);
  return clone;
}

/**
 * Parse a JSON value that is either a Theme Pack document envelope or a bare pack.
 * Throws on invalid input.
 */
export function parseThemePackJson(json: unknown): ThemePack {
  const prepared = prepareThemePackJsonForParse(json);
  const asDocument = themePackDocumentSchema.safeParse(prepared);
  if (asDocument.success) return asDocument.data.pack;
  const asPack = themePackSchema.safeParse(prepared);
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
