import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs'),
  path.join(root, 'node_modules', 'prettier', 'bin-prettier.js'),
];

const prettierCli = candidates.find((p) => existsSync(p));

if (!prettierCli) {
  console.error(
    'Prettier is not installed (missing node_modules/prettier). Run `npm install` in the repo root.',
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [prettierCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: root,
  windowsHide: true,
});

process.exit(result.status === null ? 1 : result.status);
