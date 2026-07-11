import {
  databaseWorkerResponseSchema,
  type DatabaseWorkerRequest,
  type DatabaseWorkerResponse,
} from '../../core/contracts/database';
import type { DatabasePort } from '../../core/ports/DatabasePort';

/**
 * PR5: OPFS business write path is hard-disabled (design §6.14).
 * createExtensionPorts no longer wires this port. The implementation remains
 * only so accidental imports throw before spawning the worker.
 * PR6 deletes the worker and this port entirely.
 */
const OPFS_BUSINESS_EXECUTE_HARD_OFF = true;

interface PendingRequest {
  resolve(response: DatabaseWorkerResponse): void;
  reject(error: Error): void;
}

const pendingRequests = new Map<string, PendingRequest>();
let worker: Worker | null = null;

function getDatabaseWorker() {
  if (worker) return worker;

  worker = new Worker(new URL('./databaseWorker.ts', import.meta.url), {
    type: 'module',
    name: 'khaosbox-database',
  });
  worker.addEventListener('message', (event: MessageEvent<unknown>) => {
    // Storage mode diagnostics from the worker are not request/response pairs.
    if (
      event.data &&
      typeof event.data === 'object' &&
      'type' in event.data &&
      (event.data as { type?: string }).type === 'khaosbox-db-storage'
    ) {
      const storage = (event.data as { storage?: string }).storage ?? 'unknown';
      if (storage === 'memory') {
        console.error(
          '[KhaosBox] Extension database is in-memory. Workspace changes will not survive reloads.',
        );
      } else {
        console.info(`[KhaosBox] Extension database ready (${storage}).`);
      }
      return;
    }

    const parsed = databaseWorkerResponseSchema.safeParse(event.data);
    if (!parsed.success) return;
    const pending = pendingRequests.get(parsed.data.id);
    if (!pending) return;
    pendingRequests.delete(parsed.data.id);
    pending.resolve(parsed.data);
  });
  worker.addEventListener('error', (event) => {
    const error = new Error(event.message || 'KhaosBox database worker failed.');
    for (const pending of pendingRequests.values()) pending.reject(error);
    pendingRequests.clear();
  });

  return worker;
}

export const extensionDatabasePort: DatabasePort = {
  async execute(request) {
    if (OPFS_BUSINESS_EXECUTE_HARD_OFF) {
      throw new Error(
        'Extension OPFS database execute is hard-disabled in Runtime mode (PR5). Business I/O must use RuntimeClient.',
      );
    }

    const databaseWorker = getDatabaseWorker();
    const message: DatabaseWorkerRequest = {
      id: crypto.randomUUID(),
      request,
    };
    const response = await new Promise<DatabaseWorkerResponse>((resolve, reject) => {
      pendingRequests.set(message.id, { resolve, reject });
      databaseWorker.postMessage(message);
    });

    if (!response.ok) throw new Error(response.error);
    return response.response;
  },
};
