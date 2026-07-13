/**
 * Theme pack directory and filename conventions.
 *
 * Built-in packs (product, same format as user packs):
 *   repo: `themes/builtin/<id>/theme.cardo-theme.json`
 *   loaded at build via Vite glob — palettes are not authored in TS.
 *
 * User packs (drop folder under Cardo data directory):
 *   - Windows: `%APPDATA%/cardo/themes/`
 *   - macOS: `~/Library/Application Support/cardo/themes/`
 *   - Linux: `~/.config/cardo/themes/`
 *   - Override root: `CARDO_DATA_DIR/themes`
 *
 * Valid user layouts (first match wins per pack id):
 *   1. Directory pack: `<themesDir>/<any-folder>/theme.cardo-theme.json`
 *   2. Flat file: `<themesDir>/*.cardo-theme.json` (or bare `*.json` document)
 *
 * Official built-in ids are reserved: disk packs with those ids are ignored.
 * See `themes/README.md` for the authoring guide.
 */

import {
  THEME_FILE_EXTENSION,
  THEME_PACK_DOCUMENT_FORMAT,
  THEME_PACK_DOCUMENT_VERSION,
  THEME_PACK_ENTRY_FILENAME,
} from '../../core/contracts/themePack';

export {
  THEME_FILE_EXTENSION,
  THEME_PACK_ENTRY_FILENAME,
  THEME_PACK_DOCUMENT_FORMAT as THEME_PACK_FORMAT,
  THEME_PACK_DOCUMENT_VERSION as THEME_PACK_FORMAT_VERSION,
};

/** Relative segment under Cardo dataDir for user theme packs. */
export const THEME_DIRECTORY_RELATIVE = 'themes';

/** Repo-relative root for shipped built-in packs. */
export const BUILTIN_THEMES_REPO_RELATIVE = 'themes/builtin';

/** Official product default theme id (must exist under themes/builtin/codex/). */
export const OFFICIAL_DEFAULT_THEME_ID = 'codex' as const;
