/**
 * Active client registry + last-client grace timer (design §6.6.1).
 *
 * Active client:
 * - Prefer open `/v1/events` stream (streaming=true keeps client alive).
 * - Otherwise explicit session until session.bye or idle timeout (default 60s no HTTP).
 *
 * lifetimeMode=auto: grace starts when clientCount hits 0, including at startup
 * (detached Runtime with no clients must exit after grace).
 */

export type RuntimeClientKind = 'web' | 'extension' | 'desktop' | 'cli-probe';

export interface RegisteredClient {
  id: string;
  kind: RuntimeClientKind;
  connectedAt: string;
  lastSeenAt: string;
  streaming: boolean;
}

export interface ClientRegistryOptions {
  lifetimeMode: 'foreground' | 'auto';
  clientGraceMs: number;
  /** Idle timeout for non-streaming clients (default 60s). */
  clientIdleMs?: number;
  onGraceStop: () => void;
}

const DEFAULT_CLIENT_IDLE_MS = 60_000;
const IDLE_SWEEP_INTERVAL_MS = 10_000;

export class ClientRegistry {
  private clients = new Map<string, RegisteredClient>();
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private readonly lifetimeMode: 'foreground' | 'auto';
  private readonly clientGraceMs: number;
  private readonly clientIdleMs: number;
  private readonly onGraceStop: () => void;

  constructor(options: ClientRegistryOptions) {
    this.lifetimeMode = options.lifetimeMode;
    this.clientGraceMs = options.clientGraceMs;
    this.clientIdleMs = options.clientIdleMs ?? DEFAULT_CLIENT_IDLE_MS;
    this.onGraceStop = options.onGraceStop;

    this.idleTimer = setInterval(() => {
      this.sweepIdleClients();
    }, IDLE_SWEEP_INTERVAL_MS);
    this.idleTimer.unref?.();
  }

  get clientCount(): number {
    return this.clients.size;
  }

  get graceActive(): boolean {
    return this.graceTimer != null;
  }

  list(): RegisteredClient[] {
    return [...this.clients.values()];
  }

  has(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  register(kind: RuntimeClientKind): RegisteredClient {
    const now = new Date().toISOString();
    const client: RegisteredClient = {
      id: crypto.randomUUID(),
      kind,
      connectedAt: now,
      lastSeenAt: now,
      streaming: false,
    };
    this.clients.set(client.id, client);
    this.cancelGrace();
    return client;
  }

  touch(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    client.lastSeenAt = new Date().toISOString();
  }

  setStreaming(clientId: string, streaming: boolean): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    client.streaming = streaming;
    client.lastSeenAt = new Date().toISOString();
  }

  unregister(clientId: string): void {
    if (!this.clients.delete(clientId)) return;
    this.maybeStartGrace();
  }

  /** Mark client inactive when event stream closes; unregister (design §6.6.1). */
  onStreamClose(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    client.streaming = false;
    client.lastSeenAt = new Date().toISOString();
    this.unregister(clientId);
  }

  /**
   * Start grace if already empty. Call after startRuntime when lifetimeMode=auto
   * so detached processes without any hello still stop after grace.
   */
  startGraceIfEmpty(): void {
    this.maybeStartGrace();
  }

  cancelGrace(): void {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
  }

  dispose(): void {
    this.cancelGrace();
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    this.clients.clear();
  }

  /**
   * Drop non-streaming clients whose lastSeenAt is older than clientIdleMs.
   * Event-stream clients are kept alive by the open connection (streaming=true).
   */
  private sweepIdleClients(): void {
    const now = Date.now();
    const toRemove: string[] = [];
    for (const [id, client] of this.clients) {
      if (client.streaming) continue;
      const last = Date.parse(client.lastSeenAt);
      if (Number.isNaN(last) || now - last >= this.clientIdleMs) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      this.unregister(id);
    }
  }

  private maybeStartGrace(): void {
    if (this.lifetimeMode !== 'auto') return;
    if (this.clients.size > 0) return;
    if (this.graceTimer) return;
    this.graceTimer = setTimeout(() => {
      this.graceTimer = null;
      if (this.clients.size === 0 && this.lifetimeMode === 'auto') {
        this.onGraceStop();
      }
    }, this.clientGraceMs);
    // Keep process alive for grace when HTTP server is listening (do not unref).
    // Previously unref'd timers let Node exit early or skip grace in edge cases;
    // the HTTP server already keeps the event loop alive for auto mode.
  }
}
