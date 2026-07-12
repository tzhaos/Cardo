/**
 * Validate shipped built-in theme documents and recipe wiring.
 *
 *   npx tsx scripts/validate-builtin-themes.ts
 *
 * Checks:
 * 1. themes/builtin/<id>/theme.cardo-theme.json parses under themePackSchema
 * 2. pack.id matches folder name and OFFICIAL_BUILT_IN_THEME_IDS
 * 3. light + dark palettes present (schema-enforced)
 * 4. settingsChrome / settingsHover look opaque (readable settings shells)
 * 5. official recipe CSS entry exists for each id
 * 6. chrome.material is explicit (glass | solid)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OFFICIAL_BUILT_IN_THEME_IDS,
  OFFICIAL_THEME_RECIPE_ENTRIES,
  THEME_PACK_ENTRY_FILENAME,
  type ThemePack,
} from '../src/core/contracts/themePack';
import { parseThemePackDocumentText } from '../src/core/contracts/themePackIO';
import { BUILTIN_THEMES_REPO_RELATIVE } from '../src/web-next/themes/themePaths';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builtinRoot = path.join(root, BUILTIN_THEMES_REPO_RELATIVE);

let failed = 0;
const found = new Set<string>();

function fail(message: string) {
  failed += 1;
  console.error(message);
}

/**
 * Best-effort opacity check for settings shell readability.
 * Rejects rgba/hsla with alpha < 1 and #rrggbbaa with aa < ff.
 */
function looksOpaqueCssColor(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v.startsWith('#')) {
    if (v.length === 9) {
      const alpha = Number.parseInt(v.slice(7, 9), 16);
      return Number.isFinite(alpha) && alpha >= 0xf0;
    }
    if (v.length === 5) {
      const nibble = Number.parseInt(v[4] ?? 'f', 16);
      return Number.isFinite(nibble) && nibble >= 0xe;
    }
    return v.length === 4 || v.length === 7;
  }
  const rgba = v.match(/^rgba?\((.+)\)$/);
  if (rgba) {
    const parts = rgba[1].split(',').map((part) => part.trim());
    if (parts.length === 3) return true;
    if (parts.length === 4) {
      const alpha = Number.parseFloat(parts[3] ?? '1');
      return Number.isFinite(alpha) && alpha >= 0.97;
    }
  }
  const hsla = v.match(/^hsla?\((.+)\)$/);
  if (hsla) {
    const parts = hsla[1].split(',').map((part) => part.trim());
    if (parts.length === 3) return true;
    if (parts.length === 4) {
      const alpha = Number.parseFloat(parts[3] ?? '1');
      return Number.isFinite(alpha) && alpha >= 0.97;
    }
  }
  // color-mix / named colors — allow with warning only at call site
  return !v.includes('rgba(') && !v.includes('hsla(');
}

function validatePackSurface(pack: ThemePack) {
  for (const mode of ['light', 'dark'] as const) {
    const colors = pack.tokens.colors[mode];
    if (!colors) {
      fail(`${pack.id}: missing ${mode} palette`);
      continue;
    }
    for (const key of ['settingsChrome', 'settingsHover'] as const) {
      const value = colors[key];
      if (!value) {
        fail(`${pack.id}/${mode}: missing ${key}`);
        continue;
      }
      if (!looksOpaqueCssColor(value)) {
        fail(
          `${pack.id}/${mode}: ${key} should be opaque for readable settings text (got "${value}")`,
        );
      }
    }
  }

  const material = pack.tokens.chrome?.material;
  if (!material) {
    fail(
      `${pack.id}: tokens.chrome.material should be explicit ("glass" | "solid") — see theme-pack-authoring.md`,
    );
  }

  const recipeRel = OFFICIAL_THEME_RECIPE_ENTRIES[pack.id];
  if (!recipeRel) {
    fail(`${pack.id}: missing OFFICIAL_THEME_RECIPE_ENTRIES mapping`);
  } else {
    const recipePath = path.join(root, recipeRel);
    if (!fs.existsSync(recipePath)) {
      fail(`${pack.id}: missing recipe CSS at ${recipeRel}`);
    } else {
      console.log(`  recipe ${recipeRel}`);
    }
  }
}

for (const id of OFFICIAL_BUILT_IN_THEME_IDS) {
  const filePath = path.join(builtinRoot, id, THEME_PACK_ENTRY_FILENAME);
  if (!fs.existsSync(filePath)) {
    fail(`missing: ${path.relative(root, filePath)}`);
    continue;
  }
  try {
    const pack = parseThemePackDocumentText(fs.readFileSync(filePath, 'utf8'));
    if (pack.id !== id) {
      throw new Error(`pack.id "${pack.id}" does not match folder "${id}"`);
    }
    found.add(pack.id);
    console.log(`ok ${id} v${pack.version} material=${pack.tokens.chrome?.material ?? '∅'}`);
    validatePackSurface(pack);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`invalid ${id}: ${message}`);
  }
}

for (const id of Object.keys(OFFICIAL_THEME_RECIPE_ENTRIES)) {
  if (!OFFICIAL_BUILT_IN_THEME_IDS.has(id)) {
    fail(`OFFICIAL_THEME_RECIPE_ENTRIES has orphan id "${id}" not in OFFICIAL_BUILT_IN_THEME_IDS`);
  }
}

if (found.size !== OFFICIAL_BUILT_IN_THEME_IDS.size || failed > 0) {
  process.exitCode = 1;
  console.error(`built-in theme validation failed (${failed} issue(s))`);
} else {
  console.log(`validated ${found.size} built-in theme packs + recipes`);
}
