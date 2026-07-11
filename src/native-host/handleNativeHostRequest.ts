import {
  nativeHostRequestSchema,
  nativeHostResponseSchema,
  type NativeHostResponse,
} from '../core/protocols/nativeMessaging';
import { readDiscoveryFile } from '../runtime/discovery';
import { resolveCardoDataPaths } from '../runtime/paths';
import { writeNativeHostDiagnostic } from './diagnostics';
import { openLocalResource } from './openLocalResource';

export function handleNativeHostRequest(message: unknown): NativeHostResponse {
  const request = nativeHostRequestSchema.safeParse(message);
  if (!request.success) {
    writeNativeHostDiagnostic('unsupported-request');
    return nativeHostResponseSchema.parse({
      ok: false,
      errorMessage: 'Unsupported native host request.',
    });
  }

  writeNativeHostDiagnostic(`request ${request.data.type}`);

  if (request.data.type === 'runtime.discover') {
    return discoverRuntime();
  }

  return nativeHostResponseSchema.parse(openLocalResource(request.data.resourcePath));
}

/**
 * Read discovery.json only — never open SQLite (design §6.4.1 / PR2 exit).
 */
function discoverRuntime(): NativeHostResponse {
  const { discoveryPath } = resolveCardoDataPaths();
  const discovery = readDiscoveryFile(discoveryPath);

  if (!discovery) {
    writeNativeHostDiagnostic('runtime-unavailable missing-discovery');
    return nativeHostResponseSchema.parse({
      ok: false,
      code: 'runtime_unavailable',
      errorMessage: 'Cardo Runtime is not running (discovery file missing).',
    });
  }

  writeNativeHostDiagnostic(`runtime-discover ${discovery.baseUrl}`);
  return nativeHostResponseSchema.parse({
    ok: true,
    type: 'runtime.discover.ok',
    baseUrl: discovery.baseUrl,
    port: discovery.port,
    token: discovery.token,
    pid: discovery.pid,
    startedBy: discovery.startedBy,
    lifetimeMode: discovery.lifetimeMode,
    schemaVersion: discovery.schemaVersion,
    startedAt: discovery.startedAt,
  });
}
