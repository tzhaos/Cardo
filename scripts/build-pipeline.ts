import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface BuildStage {
  name: string;
  command: string[];
  artifacts: string[];
}

const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) {
  throw new Error('无法定位当前 npm CLI。请通过 npm run release:build 启动流水线。');
}
const npmCli = npmCliPath;

/**
 * Proxy policy:
 * - CARDO_BUILD_PROXY set to non-empty → use it
 * - CARDO_BUILD_PROXY='' → force no proxy
 * - unset + CI/GitHub Actions → no proxy
 * - unset + local → default 127.0.0.1:7890 (common local tunnel)
 */
function resolveBuildProxy(): string | undefined {
  if (Object.prototype.hasOwnProperty.call(process.env, 'CARDO_BUILD_PROXY')) {
    const value = process.env.CARDO_BUILD_PROXY?.trim() ?? '';
    return value.length > 0 ? value : undefined;
  }
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
    return undefined;
  }
  return 'http://127.0.0.1:7890';
}

const proxy = resolveBuildProxy();
const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const buildEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  NO_PROXY: process.env.NO_PROXY ?? process.env.no_proxy ?? 'localhost,127.0.0.1',
  // Unsigned open-source Windows builds: skip auto code-sign discovery.
  CSC_IDENTITY_AUTO_DISCOVERY: process.env.CSC_IDENTITY_AUTO_DISCOVERY ?? 'false',
};

if (proxy) {
  buildEnvironment.HTTP_PROXY = process.env.HTTP_PROXY ?? process.env.http_proxy ?? proxy;
  buildEnvironment.HTTPS_PROXY = process.env.HTTPS_PROXY ?? process.env.https_proxy ?? proxy;
} else if (Object.prototype.hasOwnProperty.call(process.env, 'CARDO_BUILD_PROXY')) {
  delete buildEnvironment.HTTP_PROXY;
  delete buildEnvironment.HTTPS_PROXY;
  delete buildEnvironment.http_proxy;
  delete buildEnvironment.https_proxy;
}

// Prefer GitHub Electron CDN on CI. Local default mirror helps China networks.
if (!isCi && !process.env.ELECTRON_MIRROR) {
  buildEnvironment.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
}

const desktopArtifacts = [
  `artifacts/desktop-dist/Cardo Setup ${rootPackage.version}.exe`,
  `artifacts/desktop-dist/Cardo ${rootPackage.version}.exe`,
];

// Release focuses on Desktop installers. CLI / extension / native-host ship via npm or other channels later.
const stages: BuildStage[] = [
  { name: '停止 Cardo 实例', command: ['run', 'cardo:stop'], artifacts: [] },
  { name: '校验', command: ['run', 'check'], artifacts: [] },
  {
    name: 'Electron Windows 出包',
    command: ['run', 'desktop:package'],
    artifacts: desktopArtifacts,
  },
];

for (const stage of stages) {
  console.log(`\n=== ${stage.name} ===`);
  const result = spawnSync(process.execPath, [npmCli, ...stage.command], {
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

console.log('\nDesktop release 构建流水线已完成。');
