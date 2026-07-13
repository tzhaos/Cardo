/**
 * Persist and resolve HTTP proxy for Desktop update downloads (China-friendly).
 * Stored under userData (shell config — not Runtime SQLite).
 */

import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_UPDATE_PROXY_SETTINGS,
  updateProxySettingsInputSchema,
  updateProxySettingsSchema,
  type UpdateProxySettings,
} from '../../core/contracts/updateProxy';
import { canConnectTcp, normalizeProxyUrl, readEnvProxyUrl } from './proxyUrl';

const FILE_NAME = 'update-proxy.json';

/** Common local proxy ports (Clash / V2RayN / Surge / etc.). */
export const COMMON_LOCAL_PROXY_PORTS = [
  7890, 7897, 10809, 10808, 1087, 1080, 20171, 7891,
] as const;

export { normalizeProxyUrl } from './proxyUrl';

function settingsPath(): string {
  return path.join(app.getPath('userData'), FILE_NAME);
}

export function readUpdateProxySettings(): UpdateProxySettings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    const parsed = updateProxySettingsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // missing or invalid → defaults
  }
  return { ...DEFAULT_UPDATE_PROXY_SETTINGS };
}

export function writeUpdateProxySettings(input: unknown): UpdateProxySettings {
  const settings = updateProxySettingsSchema.parse(updateProxySettingsInputSchema.parse(input));
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return settings;
}

/**
 * Resolve effective proxy URL for this download/check session.
 * Returns null for direct connection.
 */
export async function resolveUpdateProxyUrl(
  settings: UpdateProxySettings = readUpdateProxySettings(),
): Promise<string | null> {
  if (settings.mode === 'off') return null;

  if (settings.mode === 'manual') {
    const host = settings.host.trim() || '127.0.0.1';
    return normalizeProxyUrl(`http://${host}:${settings.port}`);
  }

  const fromEnv = readEnvProxyUrl();
  if (fromEnv) return fromEnv;

  const preferredHost = settings.host.trim() || '127.0.0.1';
  const preferredPort = settings.port;
  if (await canConnectTcp(preferredHost, preferredPort, 250)) {
    return `http://${preferredHost}:${preferredPort}`;
  }

  for (const port of COMMON_LOCAL_PROXY_PORTS) {
    if (port === preferredPort) continue;
    if (await canConnectTcp('127.0.0.1', port, 150)) {
      return `http://127.0.0.1:${port}`;
    }
  }

  return null;
}
