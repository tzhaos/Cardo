/**
 * Active client registry + last-client grace timer (design §6.6.1).
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
  onGraceStop: () => void;
}

export class ClientRegistry {
  private clients = new Map<string, RegisteredClient>();
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly lifetimeMode: 'foreground' | 'auto';
  private readonly clientGraceMs: number;
  private readonly onGraceStop: () => void;

  constructor(options: ClientRegistryOptions) {
    this.lifetimeMode = options.lifetimeMode;
    this.clientGraceMs = options.clientGraceMs;
    this.onGraceStop = options.onGraceStop;
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

  /** Mark client inactive when event stream closes; unregister if no longer streaming. */
  onStreamClose(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    client.streaming = false;
    client.lastSeenAt = new Date().toISOString();
    // Stream close is the primary unregister signal for Web/Extension/Desktop (design §6.6.1).
    this.unregister(clientId);
  }

  cancelGrace(): void {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
  }

  dispose(): void {
    this.cancelGrace();
    this.clients.clear();
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
    // Do not keep the process alive solely for the grace timer when nothing else is running.
    this.graceTimer.unref?.();
  }
}
