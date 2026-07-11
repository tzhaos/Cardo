import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { CARDO_NATIVE_HOST_NAME } from '../src/core/protocols/nativeMessaging';

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

function readArg(name: string) {
  const prefix = `--${name}=`;
  return (
    process.argv
      .slice(2)
      .find((arg) => arg.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function assertExtensionId(extensionId: string) {
  if (!/^[a-p]{32}$/.test(extensionId)) {
    throw new Error(`Invalid Chrome extension id: ${extensionId}`);
  }
}

function extensionIdFromManifestKey(manifestKey: string) {
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

function readExtensionIdFromManifest() {
  const manifestPath = path.resolve('assets/extension-shell/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { key?: unknown };

  if (typeof manifest.key !== 'string') {
    throw new Error('Usage: npm run native-host:install -- --extension-id=<chrome-extension-id>');
  }

  return extensionIdFromManifestKey(manifest.key);
}

function resolveExtensionId() {
  const extensionId = readArg('extension-id');

  if (!extensionId) {
    return readExtensionIdFromManifest();
  }

  assertExtensionId(extensionId);
  return extensionId;
}

function getBrowserPreferenceFiles() {
  const localAppData = process.env.LOCALAPPDATA;

  if (!localAppData) {
    return [];
  }

  const preferenceFiles: string[] = [];

  for (const userDataDir of WINDOWS_BROWSER_USER_DATA_DIRS) {
    const root = path.join(localAppData, userDataDir);

    if (!fs.existsSync(root)) {
      continue;
    }

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const preferencesPath = path.join(root, entry.name, 'Preferences');

      if (fs.existsSync(preferencesPath)) {
        preferenceFiles.push(preferencesPath);
      }
    }
  }

  return preferenceFiles;
}

/** Install-time discovery of loaded Cardo extension paths. */
function pathLooksLikeCardoExtension(value: unknown) {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.toLowerCase().replaceAll('\\', '/');
  return normalized.includes('/cardo') || normalized.includes('cardo');
}

function addCardoExtensionIdsFromText(text: string, extensionIds: Set<string>) {
  for (const match of text.matchAll(
    /chrome-extension:\/\/([a-p]{32})\/extension\/pages\/newtab\.html/g,
  )) {
    extensionIds.add(match[1]);
  }

  for (const match of text.matchAll(/chrome-extension:\/\/([a-p]{32})":\{"kbe":true\}/g)) {
    extensionIds.add(match[1]);
  }
}

function discoverCardoExtensionIdsFromPreferences() {
  const extensionIds = new Set<string>();

  for (const preferencesPath of getBrowserPreferenceFiles()) {
    const text = fs.readFileSync(preferencesPath, 'utf8');
    addCardoExtensionIdsFromText(text, extensionIds);

    try {
      const preferences = JSON.parse(text) as {
        extensions?: {
          chrome_url_overrides?: { newtab?: Array<{ entry?: unknown }> };
          settings?: Record<string, { path?: unknown; manifest?: unknown }>;
        };
        safebrowsing?: { extension_telemetry_file_data?: Record<string, unknown> };
      };

      for (const override of preferences.extensions?.chrome_url_overrides?.newtab ?? []) {
        if (typeof override.entry !== 'string') {
          continue;
        }

        const match = /^chrome-extension:\/\/([a-p]{32})\/extension\/pages\/newtab\.html$/.exec(
          override.entry,
        );

        if (match) {
          extensionIds.add(match[1]);
        }
      }

      for (const [extensionId, extension] of Object.entries(
        preferences.extensions?.settings ?? {},
      )) {
        if (
          /^[a-p]{32}$/.test(extensionId) &&
          (pathLooksLikeCardoExtension(extension.path) ||
            JSON.stringify(extension.manifest ?? {}).toLowerCase().includes('cardo'))
        ) {
          extensionIds.add(extensionId);
        }
      }

      for (const [extensionId, telemetry] of Object.entries(
        preferences.safebrowsing?.extension_telemetry_file_data ?? {},
      )) {
        const telemetryText = JSON.stringify(telemetry);
        if (/^[a-p]{32}$/.test(extensionId) && telemetryText.includes('Cardo')) {
          extensionIds.add(extensionId);
        }
      }
    } catch {
      continue;
    }
  }

  return [...extensionIds];
}

function writeManifest(hostDir: string, hostPath: string, extensionIds: string[]) {
  const manifestPath = path.join(hostDir, `${CARDO_NATIVE_HOST_NAME}.json`);
  const manifest = {
    name: CARDO_NATIVE_HOST_NAME,
    description: 'Cardo local resource bridge',
    path: hostPath,
    type: 'stdio',
    allowed_origins: extensionIds.map((extensionId) => `chrome-extension://${extensionId}/`),
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifestPath;
}

function registerWindowsNativeHost(browserKey: string, manifestPath: string) {
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

function main() {
  if (process.platform !== 'win32') {
    throw new Error('Native host installer currently supports Windows registry registration.');
  }

  const extensionIds = [
    ...new Set([resolveExtensionId(), ...discoverCardoExtensionIdsFromPreferences()]),
  ];
  const hostDir = path.resolve('artifacts/native-host');
  const hostEntry = path.join(hostDir, 'cardo-native-host.exe');

  if (!fs.existsSync(hostEntry)) {
    throw new Error(
      'Missing artifacts/native-host/cardo-native-host.exe. Run npm run native-host:build first.',
    );
  }

  const manifestPath = writeManifest(hostDir, hostEntry, extensionIds);

  for (const browserKey of WINDOWS_BROWSER_NATIVE_HOST_KEYS) {
    registerWindowsNativeHost(browserKey, manifestPath);
  }

  console.log(`Registered ${CARDO_NATIVE_HOST_NAME}`);
  for (const extensionId of extensionIds) {
    console.log(`Allowed extension ${extensionId}`);
  }
  console.log(manifestPath);
}

main();
