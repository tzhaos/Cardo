import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

/**
 * Pure helpers mirrored for unit tests (detectInstallChannel needs electron app).
 * Keep heuristics in sync with installChannel.ts.
 */
function isTypicalInstallDirectory(dir: string, env: NodeJS.ProcessEnv): boolean {
  const normalized = path.resolve(dir).toLowerCase();
  const candidates = [
    env.ProgramFiles,
    env['ProgramFiles(x86)'],
    env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, 'Programs') : null,
  ].filter((value): value is string => Boolean(value));

  return candidates.some((root) => {
    const rootNorm = path.resolve(root).toLowerCase();
    return normalized === rootNorm || normalized.startsWith(rootNorm + path.sep);
  });
}

describe('install channel heuristics', () => {
  it('treats LocalAppData Programs as setup', () => {
    const env = {
      LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
      ProgramFiles: 'C:\\Program Files',
    };
    assert.equal(
      isTypicalInstallDirectory('C:\\Users\\me\\AppData\\Local\\Programs\\Cardo', env),
      true,
    );
  });

  it('does not treat Downloads as install tree', () => {
    const env = {
      LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
      ProgramFiles: 'C:\\Program Files',
    };
    assert.equal(isTypicalInstallDirectory('D:\\Downloads\\CardoPortable', env), false);
  });
});
