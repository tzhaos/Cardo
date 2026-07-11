/**
 * Scan Cardo dataDir/themes for user Theme Pack files.
 *
 * Valid layouts (see themes/README.md):
 *   - Directory: `<themesDir>/<folder>/theme.cardo-theme.json`
 *   - Flat file: `<themesDir>/*.cardo-theme.json` or bare `*.json` document
 *
 * Official built-in packs load from repo `themes/builtin/` (client bundle).
 * Disk packs with official ids are ignored so product builtins stay authoritative.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_THEME_PACK_JSON_BYTES,
  OFFICIAL_BUILT_IN_THEME_IDS,
  THEME_FILE_EXTENSION,
  THEME_PACK_ENTRY_FILENAME,
  type ThemePack,
} from '../core/contracts/themePack';
import { tryParseThemePackDocumentText } from '../core/contracts/themePackIO';
import { ensureThemesDir } from './paths';

export interface LocalThemePackEntry {
  /** Relative path under themesDir (file or dir entry). */
  fileName: string;
  pack: ThemePack;
}

/**
 * Read valid theme documents from themesDir.
 * Invalid files are skipped (not fatal). Official ids on disk are ignored.
 */
export function scanLocalThemePacks(themesDir: string): LocalThemePackEntry[] {
  ensureThemesDir(themesDir);
  let names: string[];
  try {
    names = fs.readdirSync(themesDir);
  } catch {
    return [];
  }

  const found: LocalThemePackEntry[] = [];
  const seenIds = new Set<string>();

  for (const name of names) {
    if (name.startsWith('.')) continue;
    const fullPath = path.join(themesDir, name);

    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      const entryPath = path.join(fullPath, THEME_PACK_ENTRY_FILENAME);
      const pack = readThemeFile(entryPath);
      if (!pack) continue;
      if (!acceptPack(pack, seenIds)) continue;
      found.push({ fileName: path.join(name, THEME_PACK_ENTRY_FILENAME), pack });
      continue;
    }

    if (!stat.isFile() || !isFlatThemeFileName(name)) continue;
    if (stat.size > MAX_THEME_PACK_JSON_BYTES) continue;

    const pack = readThemeFile(fullPath);
    if (!pack) continue;
    if (!acceptPack(pack, seenIds)) continue;
    found.push({ fileName: name, pack });
  }

  return found;
}

function acceptPack(pack: ThemePack, seenIds: Set<string>): boolean {
  if (OFFICIAL_BUILT_IN_THEME_IDS.has(pack.id)) return false;
  if (seenIds.has(pack.id)) return false;
  seenIds.add(pack.id);
  return true;
}

function isFlatThemeFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(THEME_FILE_EXTENSION) || lower.endsWith('.json');
}

function readThemeFile(fullPath: string): ThemePack | null {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(fullPath);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.size > MAX_THEME_PACK_JSON_BYTES) return null;

  let text: string;
  try {
    text = fs.readFileSync(fullPath, 'utf8');
  } catch {
    return null;
  }
  if (text.length > MAX_THEME_PACK_JSON_BYTES) return null;
  return tryParseThemePackDocumentText(text);
}
