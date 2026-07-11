/**
 * Validate shipped built-in theme documents under themes/builtin/.
 *
 *   npx tsx scripts/validate-builtin-themes.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OFFICIAL_BUILT_IN_THEME_IDS,
  THEME_PACK_ENTRY_FILENAME,
} from '../src/core/contracts/themePack';
import { parseThemePackDocumentText } from '../src/core/contracts/themePackIO';
import { BUILTIN_THEMES_REPO_RELATIVE } from '../src/web-next/themes/themePaths';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builtinRoot = path.join(root, BUILTIN_THEMES_REPO_RELATIVE);

const found = new Set<string>();
let failed = 0;

for (const id of OFFICIAL_BUILT_IN_THEME_IDS) {
  const filePath = path.join(builtinRoot, id, THEME_PACK_ENTRY_FILENAME);
  if (!fs.existsSync(filePath)) {
    console.error(`missing: ${path.relative(root, filePath)}`);
    failed += 1;
    continue;
  }
  try {
    const pack = parseThemePackDocumentText(fs.readFileSync(filePath, 'utf8'));
    if (pack.id !== id) {
      throw new Error(`pack.id "${pack.id}" does not match folder "${id}"`);
    }
    found.add(pack.id);
    console.log(`ok ${id} v${pack.version}`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`invalid ${id}: ${message}`);
  }
}

if (found.size !== OFFICIAL_BUILT_IN_THEME_IDS.size || failed > 0) {
  process.exitCode = 1;
  console.error('built-in theme validation failed');
} else {
  console.log(`validated ${found.size} built-in theme packs`);
}
