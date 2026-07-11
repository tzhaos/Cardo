import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface BuildStage {
  name: string;
  command: string[];
  artifacts: string[];
}

const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
const proxy = process.env.CARDO_BUILD_PROXY ?? 'http://127.0.0.1:7890';
const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) {
  throw new Error('无法定位当前 npm CLI。请通过 npm run release:build 启动流水线。');
}
const buildEnvironment = {
  ...process.env,
  HTTP_PROXY: process.env.HTTP_PROXY ?? process.env.http_proxy ?? proxy,
  HTTPS_PROXY: process.env.HTTPS_PROXY ?? process.env.https_proxy ?? proxy,
  NO_PROXY: process.env.NO_PROXY ?? process.env.no_proxy ?? 'localhost,127.0.0.1',
};
const desktopArtifacts = [
  `artifacts/desktop-dist/Cardo Setup ${rootPackage.version}.exe`,
  `artifacts/desktop-dist/Cardo ${rootPackage.version}.exe`,
];
const stages: BuildStage[] = [
  { name: '校验', command: ['run', 'check'], artifacts: [] },
  {
    name: '浏览器扩展构建',
    command: ['run', 'build'],
    artifacts: ['artifacts/extension/unpacked/manifest.json'],
  },
  {
    name: 'Native Host 出包',
    command: ['run', 'native-host:build'],
    artifacts: ['artifacts/native-host/cardo-native-host.exe'],
  },
  {
    name: 'Electron Windows 出包',
    command: ['run', 'desktop:package'],
    artifacts: desktopArtifacts,
  },
];

for (const stage of stages) {
  console.log(`\n=== ${stage.name} ===`);
  const result = spawnSync(process.execPath, [npmCliPath, ...stage.command], {
    cwd: process.cwd(),
    env: buildEnvironment,
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) {
    throw new Error(`${stage.name}无法启动：${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${stage.name}失败，退出码：${result.status ?? '未知'}`);
  }

  for (const artifact of stage.artifacts) {
    if (!fs.existsSync(path.resolve(artifact))) {
      throw new Error(`${stage.name}未生成预期产物：${artifact}`);
    }
  }
}

console.log('\n完整构建流水线已完成。');
