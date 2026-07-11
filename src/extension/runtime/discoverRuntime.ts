import {
  nativeHostRuntimeDiscoverOkSchema,
  type NativeHostResponse,
} from '../../core/protocols/nativeMessaging';
import { sendNativeMessage } from './sendNativeMessage';

export class RuntimeDiscoverError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RuntimeDiscoverError';
    this.code = code;
  }
}

export type RuntimeDiscovery = {
  baseUrl: string;
  token: string;
  port: number;
  pid: number;
  startedBy: 'cli' | 'desktop';
  lifetimeMode: 'foreground' | 'auto';
  schemaVersion: number;
  startedAt: string;
  revision: number;
};

/**
 * Primary Extension discovery path (design §6.4): NM `runtime.discover` only.
 * Never opens SQLite; never falls back to OPFS.
 */
export async function discoverRuntimeViaNativeMessaging(): Promise<RuntimeDiscovery> {
  let response: NativeHostResponse;

  try {
    response = await sendNativeMessage({ type: 'runtime.discover' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Chrome reports missing host as lastError — guide install native host.
    if (/not found|specified native messaging host|host not found|Access to the|nativemessaging/i.test(message)) {
      throw new RuntimeDiscoverError(
        'native_host_missing',
        message || 'Native messaging host is not installed.',
      );
    }
    throw new RuntimeDiscoverError('native_messaging_failed', message);
  }

  if (!response.ok) {
    throw new RuntimeDiscoverError(
      response.code ?? 'runtime_unavailable',
      response.errorMessage || 'Cardo Runtime is not available.',
    );
  }

  const ok = nativeHostRuntimeDiscoverOkSchema.parse(response);
  return {
    baseUrl: ok.baseUrl,
    token: ok.token,
    port: ok.port,
    pid: ok.pid,
    startedBy: ok.startedBy,
    lifetimeMode: ok.lifetimeMode,
    schemaVersion: ok.schemaVersion,
    startedAt: ok.startedAt,
    revision: ok.revision,
  };
}
