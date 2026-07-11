import {
  databaseWorkerResponseSchema,
  type DatabaseWorkerRequest,
  type DatabaseWorkerResponse,
} from '../../core/contracts/database';
import type { DatabasePort } from '../../core/ports/DatabasePort';

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
