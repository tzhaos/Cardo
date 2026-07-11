/**
 * Scan Cardo dataDir/themes for user Theme Pack files.
 * Official built-in packs stay code-defined and cannot be overwritten by disk files.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_THEME_PACK_JSON_BYTES,
  OFFICIAL_BUILT_IN_THEME_IDS,
  themePackDocumentSchema,
  themePackSchema,
  type ThemePack,
} from '../core/contracts/themePack';
import { ensureThemesDir } from './paths';

export interface LocalThemePackEntry {
  fileName: string;
  pack: ThemePack;
}

/**
 * Read `*.cardo-theme.json` and bare `*.json` theme documents from themesDir.
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

  for (const fileName of names) {
    if (!isThemeFileName(fileName)) continue;
    const fullPath = path.join(themesDir, fileName);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size > MAX_THEME_PACK_JSON_BYTES) continue;

    let text: string;
    try {
      text = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }
    if (text.length > MAX_THEME_PACK_JSON_BYTES) continue;

    const pack = parseThemeFileText(text);
    if (!pack) continue;
    if (OFFICIAL_BUILT_IN_THEME_IDS.has(pack.id)) continue;
    if (seenIds.has(pack.id)) continue;
    seenIds.add(pack.id);
    found.push({ fileName, pack });
  }

  return found;
}

function isThemeFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.cardo-theme.json') || lower.endsWith('.json');
}

function parseThemeFileText(text: string): ThemePack | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const asDocument = themePackDocumentSchema.safeParse(json);
  if (asDocument.success) return asDocument.data.pack;
  const asPack = themePackSchema.safeParse(json);
  if (asPack.success) return asPack.data;
  return null;
}
