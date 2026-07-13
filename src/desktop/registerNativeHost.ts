/**
 * Register packaged Native Messaging host for Chromium browsers (Windows).
 * Host binary ships in extraResources/native-host; manifest lives under userData.
 */

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CARDO_NATIVE_HOST_NAME } from '../core/protocols/nativeMessaging';

const WINDOWS_BROWSER_NATIVE_HOST_KEYS = [
  'Google\\Chrome',
  'Google\\Chrome Beta',
  'Google\\Chrome Dev',
  'Google\\Chrome SxS',
  'Microsoft\\Edge',
  'Microsoft\\Edge Beta',
  'Microsoft\\Edge Dev',
  'Microsoft\\Edge SxS',
] as const;

const WINDOWS_BROWSER_USER_DATA_DIRS = [
  'Google\\Chrome\\User Data',
  'Google\\Chrome Beta\\User Data',
  'Google\\Chrome Dev\\User Data',
  'Google\\Chrome SxS\\User Data',
  'Microsoft\\Edge\\User Data',
  'Microsoft\\Edge Beta\\User Data',
  'Microsoft\\Edge Dev\\User Data',
  'Microsoft\\Edge SxS\\User Data',
] as const;

function extensionIdFromManifestKey(manifestKey: string): string {
  const keyDer = Buffer.from(manifestKey, 'base64');
  const hash = createHash('sha256').update(keyDer).digest().subarray(0, 16);
  return Array.from(hash, (byte) =>
    byte
      .toString(16)
      .padStart(2, '0')
      .replace(/[0-9a-f]/g, (nibble) =>
        String.fromCharCode('a'.charCodeAt(0) + Number.parseInt(nibble, 16)),
      ),
  ).join('');
}

function pathLooksLikeCardoExtension(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.toLowerCase().replaceAll('\\', '/');
  return normalized.includes('/cardo') || normalized.includes('cardo');
}

function discoverExtensionIdsFromPreferences(): string[] {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return [];

  const extensionIds = new Set<string>();
  for (const userDataDir of WINDOWS_BROWSER_USER_DATA_DIRS) {
    const root = path.join(localAppData, userDataDir);
    if (!fs.existsSync(root)) continue;

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const preferencesPath = path.join(root, entry.name, 'Preferences');
      if (!fs.existsSync(preferencesPath)) continue;
      try {
        const preferences = JSON.parse(fs.readFileSync(preferencesPath, 'utf8')) as {
          extensions?: { settings?: Record<string, { path?: string; manifest?: unknown }> };
          safebrowsing?: { extension_telemetry_file_data?: Record<string, unknown> };
        };

        for (const [extensionId, extension] of Object.entries(
          preferences.extensions?.settings ?? {},
        )) {
          if (
            /^[a-p]{32}$/.test(extensionId) &&
            (pathLooksLikeCardoExtension(extension.path) ||
              JSON.stringify(extension.manifest ?? {})
                .toLowerCase()
                .includes('cardo'))
          ) {
            extensionIds.add(extensionId);
          }
        }
      } catch {
        // ignore corrupt preferences
      }
    }
  }
  return [...extensionIds];
}

function readBundledExtensionIds(resourcesNativeHostDir: string): string[] {
  const idsPath = path.join(resourcesNativeHostDir, 'extension-ids.json');
  if (!fs.existsSync(idsPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(idsPath, 'utf8')) as { extensionIds?: unknown };
    if (!Array.isArray(parsed.extensionIds)) return [];
    return parsed.extensionIds.filter(
      (id): id is string => typeof id === 'string' && /^[a-p]{32}$/.test(id),
    );
  } catch {
    return [];
  }
}

function readBundledManifestKeyId(resourcesNativeHostDir: string): string | null {
  const manifestPath = path.join(resourcesNativeHostDir, 'extension-manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { key?: unknown };
    if (typeof manifest.key !== 'string') return null;
    return extensionIdFromManifestKey(manifest.key);
  } catch {
    return null;
  }
}

function resolvePackagedNativeHostDir(): string | null {
  if (!app.isPackaged) return null;
  const candidate = path.join(process.resourcesPath, 'native-host');
  const hostExe = path.join(candidate, 'cardo-native-host.exe');
  return fs.existsSync(hostExe) ? candidate : null;
}

function registerWindowsNativeHost(browserKey: string, manifestPath: string): void {
  execFileSync('reg', [
    'add',
    `HKCU\\Software\\${browserKey}\\NativeMessagingHosts\\${CARDO_NATIVE_HOST_NAME}`,
    '/ve',
    '/t',
    'REG_SZ',
    '/d',
    manifestPath,
    '/f',
  ]);
}

/**
 * Idempotent: write NM manifest under userData and register HKCU for Chrome/Edge.
 * No-op when unpackaged or host binary missing.
 */
export function ensurePackagedNativeHostRegistered(): {
  ok: boolean;
  registered: boolean;
  message: string;
} {
  if (process.platform !== 'win32') {
    return { ok: true, registered: false, message: 'Native host registration is Windows-only.' };
  }
  if (!app.isPackaged) {
    return { ok: true, registered: false, message: 'Skipped (unpackaged Desktop).' };
  }

  const hostDir = resolvePackagedNativeHostDir();
  if (!hostDir) {
    return {
      ok: false,
      registered: false,
      message: 'Packaged native-host binary missing under resources/native-host.',
    };
  }

  const hostExe = path.join(hostDir, 'cardo-native-host.exe');
  const fromKey = readBundledManifestKeyId(hostDir);
  const fromBundle = readBundledExtensionIds(hostDir);
  const fromPrefs = discoverExtensionIdsFromPreferences();
  const extensionIds = [...new Set([...(fromKey ? [fromKey] : []), ...fromBundle, ...fromPrefs])];

  if (extensionIds.length === 0) {
    // Still register host path with empty allowed_origins — browsers reject until ids present.
    // Prefer at least store key id from package.
    return {
      ok: false,
      registered: false,
      message: 'No Cardo extension ids found for Native Messaging allow-list.',
    };
  }

  const stateDir = path.join(app.getPath('userData'), 'native-host');
  fs.mkdirSync(stateDir, { recursive: true });
  const manifestPath = path.join(stateDir, `${CARDO_NATIVE_HOST_NAME}.json`);
  const manifest = {
    name: CARDO_NATIVE_HOST_NAME,
    description: 'Cardo local resource bridge',
    path: hostExe,
    type: 'stdio',
    allowed_origins: extensionIds.map((id) => `chrome-extension://${id}/`),
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  for (const browserKey of WINDOWS_BROWSER_NATIVE_HOST_KEYS) {
    try {
      registerWindowsNativeHost(browserKey, manifestPath);
    } catch (error) {
      console.warn(
        `[Cardo] Native host registry update failed for ${browserKey}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return {
    ok: true,
    registered: true,
    message: `Registered ${CARDO_NATIVE_HOST_NAME} for ${extensionIds.length} extension id(s).`,
  };
}
