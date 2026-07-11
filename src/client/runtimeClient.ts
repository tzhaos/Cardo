/**
 * Cardo Runtime HTTP client (design §6.10, §6.11, §6.16).
 * Shared by Web / Extension / Desktop shells; no Electron imports.
 */

import type { WorkspaceCommand } from '../core/contracts/workspaceCommands';
import type { DatabaseCommandResult } from '../core/application/commandTypes';
import type { ActivityLogInput } from '../core/application/operationLogService';
import type { InitialWorkspacePreferences } from '../core/database/initializeWorkspaceDatabase';
import {
  activityRecordOkSchema,
  authBootstrapOkSchema,
  authExchangeOkSchema,
  commandOkSchema,
  ensureInitializedOkSchema,
  helloOkSchema,
  historyOkSchema,
  openLocalResourceOkSchema,
  queryOkSchema,
  runtimeErrorSchema,
  runtimeEventSchema,
  sessionByeOkSchema,
  workspaceExportOkSchema,
  workspaceExportOperationLogOkSchema,
  type AuthBootstrapOk,
  type AuthExchangeOk,
  type CommandOk,
  type EnsureInitializedOk,
  type HelloOk,
  type HistoryOk,
  type InvalidationScope,
  type MutationEvent,
  type QueryOk,
  type ReadyEvent,
  type RuntimeEvent,
} from '../core/contracts/runtimeProtocol';

export type RuntimeClientKind = 'web' | 'extension' | 'desktop' | 'cli-probe';

export interface RuntimeClientOptions {
  baseUrl: string;
  token: string;
  client: RuntimeClientKind;
  clientVersion?: string;
  /** Apply server-derived scopes into local stores (initiator + remote SSE). */
  onApplyScopes: (scopes: InvalidationScope[]) => Promise<void>;
  /** Optional hook when the event stream disconnects permanently or before reconnect. */
  onConnectionChange?: (status: 'connected' | 'reconnecting' | 'disconnected') => void;
}

export class RuntimeClientError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'RuntimeClientError';
    this.code = code;
    this.status = status;
  }
}

export class RuntimeClient {
  private readonly baseUrl: string;
  private token: string;
  private readonly client: RuntimeClientKind;
  private readonly clientVersion: string;
  private readonly onApplyScopes: (scopes: InvalidationScope[]) => Promise<void>;
  private readonly onConnectionChange?: RuntimeClientOptions['onConnectionChange'];

  private selfClientId: string | null = null;
  /**
   * Monotonic watermark of the highest revision this client has observed
   * (from hello, command.ok, history.ok, ensureInitialized.ok, ready, or SSE —
   * including self-echo). Never moves backward.
   */
  private localRevision = 0;
  /**
   * Highest revision for which store scopes have been applied.
   * Self-echo advances localRevision without advancing this until command.ok
   * applies (or a later catch-up covers it).
   */
  private lastAppliedRevision = 0;
  private eventsAbort: AbortController | null = null;
  private subscribeLoopActive = false;
  private closed = false;
  /** Serializes mutating HTTP requests only (not queries, not SSE). */
  private requestQueue: Promise<unknown> = Promise.resolve();
  /**
   * Single mutex for revision watermark updates + onApplyScopes (HTTP ok and SSE).
   * Queries used inside apply stay off requestQueue to avoid deadlocks.
   */
  private applyQueue: Promise<unknown> = Promise.resolve();
  private firstReadyWaiters: Array<() => void> = [];
  private firstReadySeen = false;

  constructor(options: RuntimeClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.client = options.client;
    this.clientVersion = options.clientVersion ?? '0.0.0';
    this.onApplyScopes = options.onApplyScopes;
    this.onConnectionChange = options.onConnectionChange;
  }

  get clientId(): string | null {
    return this.selfClientId;
  }

  get revision(): number {
    return this.localRevision;
  }

  get isConnected(): boolean {
    return this.selfClientId != null && !this.closed;
  }

  /** Update session token (e.g. after auth.exchange). */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Register this client with Runtime. Assigns selfClientId from hello.ok.
   * Starts the event subscription loop and waits for the first ready event
   * so bootstrap I/O cannot race the initial stream handshake.
   */
  async connect(): Promise<HelloOk> {
    if (this.closed) {
      throw new RuntimeClientError('client_closed', 'RuntimeClient is closed.');
    }
    const hello = await this.hello();
    this.selfClientId = hello.clientId;
    // hello.revision is authoritative starting watermark; stores hydrate after connect.
    this.advanceRevision(hello.revision);
    this.firstReadySeen = false;
    void this.runSubscribeLoop();
    await this.waitForFirstReady(10_000);
    return hello;
  }

  async hello(): Promise<HelloOk> {
    const json = await this.postJson('/v1/hello', {
      type: 'hello',
      client: this.client,
      clientVersion: this.clientVersion,
    });
    return helloOkSchema.parse(json);
  }

  async command(command: WorkspaceCommand, baseRevision?: number): Promise<CommandOk> {
    return this.enqueue(async () => {
      const body: Record<string, unknown> = {
        type: 'command',
        command,
      };
      if (baseRevision != null) body.baseRevision = baseRevision;
      else if (this.localRevision > 0) body.baseRevision = this.localRevision;

      const json = await this.postJson('/v1/command', body, { requireClientId: true });
      const ok = commandOkSchema.parse(json);
      await this.onMutatingHttpOk(ok);
      return ok;
    });
  }

  /** Dispatch command and return only the business result shape used by stores. */
  async dispatchCommand(command: WorkspaceCommand): Promise<DatabaseCommandResult> {
    const ok = await this.command(command);
    return ok.result ?? {};
  }

  async historyUndo(): Promise<HistoryOk> {
    return this.enqueue(async () => {
      const json = await this.postJson(
        '/v1/history/undo',
        { type: 'history.undo', baseRevision: this.localRevision },
        { requireClientId: true },
      );
      const ok = historyOkSchema.parse(json);
      await this.onMutatingHttpOk(ok);
      return ok;
    });
  }

  async historyRedo(): Promise<HistoryOk> {
    return this.enqueue(async () => {
      const json = await this.postJson(
        '/v1/history/redo',
        { type: 'history.redo', baseRevision: this.localRevision },
        { requireClientId: true },
      );
      const ok = historyOkSchema.parse(json);
      await this.onMutatingHttpOk(ok);
      return ok;
    });
  }

  async ensureInitialized(prefs: InitialWorkspacePreferences): Promise<EnsureInitializedOk> {
    return this.enqueue(async () => {
      const json = await this.postJson(
        '/v1/workspace/ensure-initialized',
        {
          type: 'workspace.ensureInitialized',
          locale: prefs.locale,
          colorMode: prefs.colorMode,
        },
        { requireClientId: true },
      );
      const ok = ensureInitializedOkSchema.parse(json);
      await this.onMutatingHttpOk(ok);
      return ok;
    });
  }

  async activityRecord(input: ActivityLogInput): Promise<void> {
    const json = await this.postJson('/v1/activity/record', {
      type: 'activity.record',
      action: input.action,
      ...(input.target ? { target: input.target } : {}),
      ...(input.details ? { details: input.details } : {}),
    });
    activityRecordOkSchema.parse(json);
  }

  async queryWorkspaceProjection() {
    return this.queryData<Extract<QueryOk, { type: 'query.workspaceProjection.ok' }>['data']>(
      '/v1/query/workspace-projection',
      'query.workspaceProjection.ok',
    );
  }

  async queryWorkspaceState() {
    return this.queryData<Extract<QueryOk, { type: 'query.workspaceState.ok' }>['data']>(
      '/v1/query/workspace-state',
      'query.workspaceState.ok',
    );
  }

  async queryPageTabs() {
    return this.queryData<Extract<QueryOk, { type: 'query.pageTabs.ok' }>['data']>(
      '/v1/query/page-tabs',
      'query.pageTabs.ok',
    );
  }

  async queryPageBoxes(pageId: string) {
    return this.queryData<Extract<QueryOk, { type: 'query.pageBoxes.ok' }>['data']>(
      `/v1/query/page-boxes?pageId=${encodeURIComponent(pageId)}`,
      'query.pageBoxes.ok',
    );
  }

  async queryBoxItems(boxId: string) {
    return this.queryData<Extract<QueryOk, { type: 'query.boxItems.ok' }>['data']>(
      `/v1/query/box-items?boxId=${encodeURIComponent(boxId)}`,
      'query.boxItems.ok',
    );
  }

  async queryPreferences() {
    return this.queryData<Extract<QueryOk, { type: 'query.preferences.ok' }>['data']>(
      '/v1/query/preferences',
      'query.preferences.ok',
    );
  }

  async queryLocalThemePacks() {
    return this.queryData<Extract<QueryOk, { type: 'query.localThemePacks.ok' }>['data']>(
      '/v1/query/local-theme-packs',
      'query.localThemePacks.ok',
    );
  }

  async queryHistoryState() {
    return this.queryData<Extract<QueryOk, { type: 'query.historyState.ok' }>['data']>(
      '/v1/query/history-state',
      'query.historyState.ok',
    );
  }

  async queryGlobalSearch(query: string) {
    return this.queryData<Extract<QueryOk, { type: 'query.globalSearch.ok' }>['data']>(
      `/v1/query/global-search?query=${encodeURIComponent(query)}`,
      'query.globalSearch.ok',
    );
  }

  async queryOperationLog(limit?: number) {
    const suffix = limit != null ? `?limit=${limit}` : '';
    return this.queryData<Extract<QueryOk, { type: 'query.operationLog.ok' }>['data']>(
      `/v1/query/operation-log${suffix}`,
      'query.operationLog.ok',
    );
  }

  async exportWorkspace() {
    const json = await this.getJson('/v1/workspace/export');
    return workspaceExportOkSchema.parse(json);
  }

  async exportOperationLog() {
    const json = await this.getJson('/v1/workspace/export-operation-log');
    return workspaceExportOperationLogOkSchema.parse(json);
  }

  async openLocalResource(resourcePath: string): Promise<boolean> {
    const json = await this.postJson(
      '/v1/capability/open-local-resource',
      {
        type: 'capability.openLocalResource',
        path: resourcePath,
      },
      { requireClientId: true },
    );
    return openLocalResourceOkSchema.parse(json).opened;
  }

  /**
   * Full catch-up from DB SoT (design §6.9.2 / §6.10).
   * Serialized on the apply mutex; does not change revision watermarks by itself.
   */
  async fullCatchUp(): Promise<void> {
    await this.enqueueApply(() => this.fullCatchUpUnlocked());
  }

  async bye(): Promise<void> {
    if (!this.selfClientId) return;
    try {
      const json = await this.postJson('/v1/session/bye', {
        type: 'session.bye',
        clientId: this.selfClientId,
      });
      sessionByeOkSchema.parse(json);
    } catch {
      // best-effort
    }
  }

  /** Stop event loop and unregister. */
  async close(): Promise<void> {
    this.closed = true;
    this.eventsAbort?.abort();
    this.eventsAbort = null;
    this.subscribeLoopActive = false;
    this.resolveFirstReadyWaiters();
    await this.bye();
    this.selfClientId = null;
    this.onConnectionChange?.('disconnected');
  }

  // --- revision + apply mutex (design §6.10 / §6.11.2) ---

  /** Never move localRevision backward. */
  private advanceRevision(revision: number): void {
    if (revision > this.localRevision) {
      this.localRevision = revision;
    }
  }

  private markApplied(revision: number): void {
    if (revision > this.lastAppliedRevision) {
      this.lastAppliedRevision = revision;
    }
  }

  private enqueueApply<T>(task: () => Promise<T>): Promise<T> {
    const result = this.applyQueue.then(task, task);
    this.applyQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async fullCatchUpUnlocked(): Promise<void> {
    await this.onApplyScopes([
      { type: 'projection' },
      { type: 'preferences' },
      { type: 'history' },
    ]);
  }

  /**
   * Initiator path: apply scopes from mutating HTTP only when revision is still
   * ahead of lastAppliedRevision. Stale/late responses never re-apply or clamp down.
   */
  private async onMutatingHttpOk(
    response: CommandOk | HistoryOk | EnsureInitializedOk,
  ): Promise<void> {
    await this.enqueueApply(async () => {
      const revision = response.revision;

      if ('applied' in response && response.applied === false) {
        this.advanceRevision(revision);
        return;
      }
      if ('created' in response && response.created === false) {
        this.advanceRevision(revision);
        return;
      }

      // Already applied a newer or equal revision (e.g. SSE catch-up won the race).
      if (revision <= this.lastAppliedRevision) {
        this.advanceRevision(revision);
        return;
      }

      const scopes = response.scopes ?? [];
      if (scopes.length > 0) {
        // Gap vs last applied → full catch-up rather than applying intermediate scopes.
        if (
          this.lastAppliedRevision > 0 &&
          revision > this.lastAppliedRevision + 1
        ) {
          await this.fullCatchUpUnlocked();
        } else {
          await this.onApplyScopes(scopes);
        }
        this.markApplied(revision);
      }
      this.advanceRevision(revision);
    });
  }

  private async onRuntimeEvent(event: RuntimeEvent): Promise<void> {
    if (event.type === 'ready') {
      await this.onReadyEvent(event);
      return;
    }
    if (event.type === 'mutation') {
      await this.onMutationEvent(event);
    }
  }

  private async onReadyEvent(event: ReadyEvent): Promise<void> {
    await this.enqueueApply(async () => {
      try {
        // Stale ready (bootstrap raced ahead) — never clamp localRevision down.
        if (event.revision < this.localRevision) {
          return;
        }
        if (event.revision > this.localRevision) {
          // Server is ahead (reconnect or mutations between hello and ready).
          await this.fullCatchUpUnlocked();
          this.markApplied(event.revision);
          this.advanceRevision(event.revision);
          return;
        }
        // Equal watermark after reconnect with lagging apply — heal without clamping.
        // Fresh connect (lastAppliedRevision === 0) leaves hydration to ensureInitialized
        // + store.initialize so we do not query empty preferences before seed.
        if (
          this.lastAppliedRevision > 0 &&
          this.lastAppliedRevision < event.revision
        ) {
          await this.fullCatchUpUnlocked();
          this.markApplied(event.revision);
        }
      } finally {
        this.resolveFirstReadyWaiters();
      }
    });
  }

  private async onMutationEvent(event: MutationEvent): Promise<void> {
    await this.enqueueApply(async () => {
      // Self-echo: initiator applies from HTTP ok; still advance observed watermark.
      // Gap/consecutive decisions use lastAppliedRevision only (Issue 7): after self-echo
      // advances localRevision without apply, a later remote rev must not apply narrow
      // scopes and skip the initiator's intermediate revision.
      if (this.selfClientId && event.sourceClientId === this.selfClientId) {
        this.advanceRevision(event.revision);
        return;
      }

      if (event.revision <= this.lastAppliedRevision) {
        this.advanceRevision(event.revision);
        return;
      }

      // Consecutive vs last applied store state — not vs observed localRevision.
      if (event.revision === this.lastAppliedRevision + 1) {
        await this.onApplyScopes(event.scopes);
        this.markApplied(event.revision);
        this.advanceRevision(event.revision);
        return;
      }

      // Gap vs lastApplied (includes: self-echo left lastApplied behind, remote jumped ahead)
      // → full catch-up so intermediate initiator revisions are included.
      await this.fullCatchUpUnlocked();
      this.markApplied(event.revision);
      this.advanceRevision(event.revision);
    });
  }

  private waitForFirstReady(timeoutMs: number): Promise<void> {
    if (this.firstReadySeen) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.firstReadyWaiters = this.firstReadyWaiters.filter((w) => w !== onReady);
        resolve();
      }, timeoutMs);
      const onReady = () => {
        clearTimeout(timer);
        resolve();
      };
      this.firstReadyWaiters.push(onReady);
    });
  }

  private resolveFirstReadyWaiters(): void {
    this.firstReadySeen = true;
    const waiters = this.firstReadyWaiters;
    this.firstReadyWaiters = [];
    for (const resolve of waiters) resolve();
  }

  // --- event stream (fetch + ReadableStream, not EventSource) ---

  private async runSubscribeLoop(): Promise<void> {
    if (this.subscribeLoopActive || this.closed) return;
    this.subscribeLoopActive = true;
    let backoffMs = 250;
    let everConnected = false;

    while (!this.closed && this.selfClientId) {
      try {
        // Do not claim "connected" before the stream is accepted (Issue 6).
        if (everConnected) {
          this.onConnectionChange?.('reconnecting');
        }
        await this.subscribeEventsOnce();
        backoffMs = 250;
        everConnected = true;
      } catch {
        if (this.closed) break;
        this.onConnectionChange?.('reconnecting');
        // Ensure connect() is not stuck forever if stream fails before first ready.
        this.resolveFirstReadyWaiters();
        await sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, 8_000);
      }
    }

    this.subscribeLoopActive = false;
  }

  /**
   * Single long-lived GET /v1/events stream. Throws on disconnect for reconnect loop.
   */
  private async subscribeEventsOnce(): Promise<void> {
    this.eventsAbort?.abort();
    const abort = new AbortController();
    this.eventsAbort = abort;

    const response = await fetch(`${this.baseUrl}/v1/events`, {
      method: 'GET',
      headers: this.buildHeaders({ requireClientId: true, acceptSse: true }),
      signal: abort.signal,
    });

    if (!response.ok) {
      throw await this.toError(response);
    }
    if (!response.body) {
      throw new RuntimeClientError('stream_unavailable', 'Event stream has no body.');
    }

    this.onConnectionChange?.('connected');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (!this.closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const event = parseSseBlock(part);
          if (!event) continue;
          try {
            await this.onRuntimeEvent(event);
          } catch (error) {
            console.error('Failed to apply runtime event', error);
          }
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore
      }
    }

    if (!this.closed) {
      throw new RuntimeClientError('stream_closed', 'Event stream closed.');
    }
  }

  // --- HTTP helpers ---

  private async queryData<TData>(path: string, expectedType: QueryOk['type']): Promise<TData> {
    const json = await this.getJson(path);
    const parsed = queryOkSchema.parse(json);
    if (parsed.type !== expectedType) {
      throw new RuntimeClientError(
        'invalid_payload',
        `Expected ${expectedType}, got ${parsed.type}`,
      );
    }
    return (parsed as unknown as { data: TData }).data;
  }

  private async getJson(path: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.buildHeaders({ requireClientId: false }),
    });
    if (!response.ok) throw await this.toError(response);
    return response.json();
  }

  private async postJson(
    path: string,
    body: unknown,
    options?: { requireClientId?: boolean },
  ): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.buildHeaders({
        requireClientId: options?.requireClientId ?? false,
        json: true,
      }),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await this.toError(response);
    return response.json();
  }

  private buildHeaders(options: {
    requireClientId: boolean;
    json?: boolean;
    acceptSse?: boolean;
  }): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    if (options.json) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.acceptSse) {
      headers.Accept = 'text/event-stream';
    }
    if (this.selfClientId) {
      headers['X-Cardo-Client-Id'] = this.selfClientId;
    } else if (options.requireClientId) {
      throw new RuntimeClientError(
        'not_connected',
        'RuntimeClient must hello() before this request.',
      );
    }
    return headers;
  }

  private async toError(response: Response): Promise<RuntimeClientError> {
    try {
      const json: unknown = await response.json();
      const parsed = runtimeErrorSchema.safeParse(json);
      if (parsed.success) {
        return new RuntimeClientError(parsed.data.code, parsed.data.message, response.status);
      }
    } catch {
      // ignore
    }
    return new RuntimeClientError(
      'http_error',
      `Runtime request failed with HTTP ${response.status}`,
      response.status,
    );
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.requestQueue.then(task, task);
    this.requestQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

/** Exchange one-time bootstrap code for session token (no prior client id). */
export async function exchangeOneTimeCode(
  baseUrl: string,
  oneTimeCode: string,
): Promise<AuthExchangeOk> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'auth.exchange', oneTimeCode }),
  });
  if (!response.ok) {
    let message = `auth.exchange failed with HTTP ${response.status}`;
    try {
      const json: unknown = await response.json();
      const parsed = runtimeErrorSchema.safeParse(json);
      if (parsed.success) message = parsed.data.message;
    } catch {
      // ignore
    }
    throw new RuntimeClientError('unauthorized', message, response.status);
  }
  return authExchangeOkSchema.parse(await response.json());
}

/** Steward bootstrap: issue oneTimeCode (Bearer process token). */
export async function issueBootstrapCode(
  baseUrl: string,
  processToken: string,
): Promise<AuthBootstrapOk> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/auth/bootstrap`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${processToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'auth.bootstrap' }),
  });
  if (!response.ok) {
    throw new RuntimeClientError(
      'bootstrap_failed',
      `auth.bootstrap failed with HTTP ${response.status}`,
      response.status,
    );
  }
  return authBootstrapOkSchema.parse(await response.json());
}

function parseSseBlock(block: string): RuntimeEvent | null {
  const lines = block.split(/\r?\n/);
  let data = '';
  for (const line of lines) {
    if (line.startsWith('data:')) {
      data += line.slice(5).trimStart();
    }
  }
  if (!data) return null;
  try {
    const json: unknown = JSON.parse(data);
    const parsed = runtimeEventSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
