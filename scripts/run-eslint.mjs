import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const eslintCli = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');

if (!existsSync(eslintCli)) {
  console.error(
    [
      'ESLint is not installed (missing node_modules/eslint).',
      '',
      'Fix: run `npm install` in the repo root.',
      'If `npm install` fails immediately:',
      '  - Check `npm config get registry` and network/proxy access to the registry.',
      '  - Try: `npm cache verify`, then install again; or use Node 22 LTS with npm 10.',
      '  - If package-lock.json is out of sync with package.json, delete node_modules and package-lock.json, then `npm install` to regenerate the lockfile.',
    ].join('\n'),
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [eslintCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: root,
  windowsHide: true,
});

process.exit(result.status === null ? 1 : result.status);
