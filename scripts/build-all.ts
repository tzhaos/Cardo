/**
 * Full local rebuild:
 * 1) stop every Cardo Runtime / Desktop / CLI instance
 * 2) build extension + CLI + web-runtime + desktop + native-host
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) {
  throw new Error('Run via npm run build:all so npm_execpath is set.');
}
const npmCli = npmCliPath;

function run(label: string, args: string[]) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: 'inherit',
  });
  if (result.error) {
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

run('Stop Cardo instances', ['run', 'cardo:stop']);
run('Extension build', ['run', 'build']);
run('CLI + Web Runtime build', ['run', 'cardo:build']);
run('Desktop main/preload/web-runtime build', ['run', 'desktop:build']);
run('Native Host build', ['run', 'native-host:build']);

console.log('\nFull build finished. Restart Cardo serve / Desktop to pick up new Runtime.');
