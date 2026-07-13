import fs from 'node:fs';
import path from 'node:path';

/** Pure path + env heuristic (no electron). */
export function isTypicalInstallDirectory(dir: string, env: NodeJS.ProcessEnv): boolean {
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

/** Pure fs check (no electron). */
export function isDirectoryWritable(dir: string): boolean {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
