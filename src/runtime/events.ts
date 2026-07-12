/**
 * Fetch-stream SSE fan-out (text/event-stream). Clients use fetch + Authorization header.
 */

import type { ServerResponse } from 'node:http';
import type { RuntimeEvent } from '../core/contracts/runtimeProtocol';

export interface EventSubscriber {
  id: string;
  clientId: string;
  response: ServerResponse;
}

export class EventHub {
  private subscribers = new Map<string, EventSubscriber>();

  get size(): number {
    return this.subscribers.size;
  }

  listClientIds(): string[] {
    return [...this.subscribers.values()].map((s) => s.clientId);
  }

  isClientStreaming(clientId: string): boolean {
    for (const sub of this.subscribers.values()) {
      if (sub.clientId === clientId) return true;
    }
    return false;
  }

  subscribe(options: { clientId: string; response: ServerResponse; onClose: () => void }): string {
    const id = crypto.randomUUID();
    const { clientId, response, onClose } = options;

    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.write(': connected\n\n');

    this.subscribers.set(id, { id, clientId, response });

    const cleanup = () => {
      this.subscribers.delete(id);
      onClose();
    };

    response.on('close', cleanup);
    response.on('error', cleanup);

    return id;
  }

  send(subscriberId: string, event: RuntimeEvent): void {
    const sub = this.subscribers.get(subscriberId);
    if (!sub) return;
    this.writeEvent(sub.response, event);
  }

  broadcast(event: RuntimeEvent): void {
    const payload = formatSse(event);
    for (const sub of this.subscribers.values()) {
      try {
        sub.response.write(payload);
      } catch {
        this.subscribers.delete(sub.id);
      }
    }
  }

  closeAll(): void {
    for (const sub of this.subscribers.values()) {
      try {
        sub.response.end();
      } catch {
        // ignore
      }
    }
    this.subscribers.clear();
  }

  private writeEvent(response: ServerResponse, event: RuntimeEvent): void {
    try {
      response.write(formatSse(event));
    } catch {
      // drop
    }
  }
}

function formatSse(event: RuntimeEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
