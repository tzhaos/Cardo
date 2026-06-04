import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

function runNode(args: string[]) {
  execFileSync(process.execPath, args, { stdio: 'inherit' });
}

function main() {
  if (process.platform !== 'win32') {
    throw new Error('Native host executable packaging currently supports Windows.');
  }

  const hostDir = path.resolve('artifacts/native-host');
  const hostEntry = path.join(hostDir, 'host.cjs');
  const seaConfigPath = path.join(hostDir, 'sea-config.json');
  const seaBlobPath = path.join(hostDir, 'host.blob');
  const hostExePath = path.join(hostDir, 'khaosbox-native-host.exe');
  const postjectCli = path.resolve('node_modules/postject/dist/cli.js');

  if (!fs.existsSync(hostEntry)) {
    throw new Error('Missing artifacts/native-host/host.cjs. Run Vite native host build first.');
  }

  if (!fs.existsSync(postjectCli)) {
    throw new Error('Missing postject. Run npm install first.');
  }

  fs.writeFileSync(
    seaConfigPath,
    `${JSON.stringify(
      {
        main: hostEntry,
        output: seaBlobPath,
        disableExperimentalSEAWarning: true,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  runNode([`--experimental-sea-config=${seaConfigPath}`]);
  fs.copyFileSync(process.execPath, hostExePath);
  runNode([postjectCli, hostExePath, 'NODE_SEA_BLOB', seaBlobPath, '--sentinel-fuse', SEA_FUSE]);

  console.log(hostExePath);
}

main();
