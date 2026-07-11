/**
 * Theme pack directory conventions.
 *
 * - Built-in packs: code-defined in `builtInPacks.ts` (classic freezes official look)
 * - Preference imports: preferences.importedThemePacks (Runtime-synced JSON)
 * - Local file packs (Runtime scan):
 *   - Windows: `%APPDATA%/cardo/themes/*.cardo-theme.json`
 *   - macOS: `~/Library/Application Support/cardo/themes/`
 *   - Linux: `~/.config/cardo/themes/`
 *   - Override root: `CARDO_DATA_DIR/themes`
 * - Dev drop folder (optional local work): `themes/` at repo root (not auto-scanned)
 *
 * Official built-in packs remain code-defined and cannot be overwritten by files.
 */
export const THEME_DIRECTORY_RELATIVE = 'themes';
export const THEME_FILE_EXTENSION = '.cardo-theme.json';
