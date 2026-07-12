import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * How this Desktop binary was distributed.
 * - setup: NSIS / installed under Programs (in-app update runs Setup)
 * - portable: electron-builder portable (replace the portable exe in place)
 * - dev: unpackaged electron / npm run desktop:start
 */
export type DesktopInstallChannel = 'setup' | 'portable' | 'dev';

export interface DesktopInstallChannelInfo {
  channel: DesktopInstallChannel;
  /** Directory that owns the user-facing executable (portable source dir or install dir). */
  executableDir: string;
  /** Absolute path of the user-facing executable to replace / report. */
  executablePath: string;
}

/**
 * Detect Setup vs Portable vs dev.
 *
 * Portable signals (electron-builder):
 * - PORTABLE_EXECUTABLE_DIR: folder containing the original portable .exe
 * - PORTABLE_EXECUTABLE_FILE: optional full path of that .exe
 *
 * Setup heuristics:
 * - under Program Files / LocalAppData\Programs
 * - otherwise packaged non-portable → setup
 */
export function detectInstallChannel(
  env: NodeJS.ProcessEnv = process.env,
): DesktopInstallChannelInfo {
  if (!app.isPackaged) {
    return {
      channel: 'dev',
      executableDir: path.dirname(process.execPath),
      executablePath: process.execPath,
    };
  }

  const portableDir = env.PORTABLE_EXECUTABLE_DIR?.trim();
  const portableFile = env.PORTABLE_EXECUTABLE_FILE?.trim();
  if (portableDir || portableFile) {
    const executablePath =
      portableFile && portableFile.length > 0
        ? portableFile
        : path.join(portableDir || path.dirname(process.execPath), path.basename(process.execPath));
    return {
      channel: 'portable',
      executableDir: path.dirname(executablePath),
      executablePath,
    };
  }

  const execPath = process.execPath;
  const execDir = path.dirname(execPath);
  if (isTypicalInstallDirectory(execDir, env)) {
    return {
      channel: 'setup',
      executableDir: execDir,
      executablePath: execPath,
    };
  }

  // Packaged but not under a standard install tree and no portable env:
  // treat as portable when the directory looks user-writable (zip / side-by-side).
  if (isDirectoryWritable(execDir)) {
    return {
      channel: 'portable',
      executableDir: execDir,
      executablePath: execPath,
    };
  }

  return {
    channel: 'setup',
    executableDir: execDir,
    executablePath: execPath,
  };
}

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

function isDirectoryWritable(dir: string): boolean {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
