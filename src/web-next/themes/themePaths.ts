/**
 * Theme pack directory conventions (Phase D).
 *
 * - Built-in packs: code-defined in `src/web-next/themes/builtInPacks.ts`
 * - User imports: preferences.importedThemePacks (Runtime-synced JSON)
 * - Future Desktop scan (not auto-loaded yet):
 *   - Windows: `%APPDATA%/cardo/themes/*.cardo-theme.json`
 *   - macOS: `~/Library/Application Support/cardo/themes/`
 *   - Linux: `~/.config/cardo/themes/`
 * - Dev drop folder (optional local work): `themes/` at repo root
 *
 * Official classic/ocean/orchid remain code-defined and cannot be overwritten by files.
 */
export const THEME_DIRECTORY_RELATIVE = 'themes';
export const THEME_FILE_EXTENSION = '.cardo-theme.json';
