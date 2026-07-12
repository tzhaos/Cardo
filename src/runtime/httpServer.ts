/**
 * Cardo Runtime HTTP server — Node http only, bind 127.0.0.1 (design §6.4.2, §6.11.3).
 */

import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { RuntimeHostConfig } from './config';
import type { RuntimeAuth } from './auth';
import type { CommandQueue } from './commandQueue';
import type { EventHub } from './events';
import type { ClientRegistry } from './clients';
import type { CardoDatabase } from '../core/database/createDatabaseClient';
import { executeDatabaseCommand } from '../core/application/executeDatabaseCommand';
import { deriveInvalidationScopes } from '../core/application/invalidationScopes';
import {
  getDatabaseHistoryState,
  redoDatabaseCommand,
  undoDatabaseCommand,
} from '../core/application/historyEngine';
import {
  getOperationLogEntries,
  recordDatabaseActivity,
} from '../core/application/operationLogService';
import {
  getBoxItems,
  getPageBoxes,
  getPageTabs,
  getPreferences,
  getWorkspaceProjection,
  getWorkspaceState,
} from '../core/database/workspaceQueries';
import { searchWorkspaceDatabase } from '../core/database/globalSearchQuery';
import { initializeWorkspaceDatabase } from '../core/database/initializeWorkspaceDatabase';
import { getRevision } from '../core/database/revision';
import { DATABASE_SCHEMA_VERSION } from '../core/database/version';
import {
  WORKSPACE_TRANSFER_VERSION,
  workspaceTransferDocumentSchema,
} from '../core/contracts/workspaceTransfer';
import {
  activityRecordRequestSchema,
  authExchangeRequestSchema,
  commandRequestSchema,
  commandOkSchema,
  ensureInitializedOkSchema,
  ensureInitializedRequestSchema,
  helloOkSchema,
  helloRequestSchema,
  historyOkSchema,
  openLocalResourceRequestSchema,
  queryRequestSchema,
  runtimeErrorSchema,
  sessionByeRequestSchema,
  type RuntimeEvent,
} from '../core/contracts/runtimeProtocol';
import { openLocalResourceViaHooks } from './capabilities';
import { scanLocalThemePacks } from './localThemePacks';
import { CARDO_THEMES_DIRNAME } from './paths';

export interface RuntimeHttpContext {
  config: RuntimeHostConfig;
  auth: RuntimeAuth;
  queue: CommandQueue;
  events: EventHub;
  clients: ClientRegistry;
  database: CardoDatabase;
  dbPath: string;
  startedAtMs: number;
  getPort: () => number;
  getBaseUrl: () => string;
  onShutdown: () => void;
  metrics: {
    corsRejectedCount: number;
    authFailCount: number;
    lastMutationAt: string | null;
  };
}

export function createRuntimeHttpServer(ctx: RuntimeHttpContext): http.Server {
  return http.createServer((req, res) => {
    void handleRequest(ctx, req, res);
  });
}

async function handleRequest(
  ctx: RuntimeHttpContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const origin = req.headers.origin;
    const cors = resolveCors(origin, ctx.getPort());
    if (cors.rejected) {
      ctx.metrics.corsRejectedCount += 1;
      applyCors(res, null);
      sendJson(res, 403, runtimeErrorSchema.parse({
        ok: false,
        code: 'cors_rejected',
        message: 'Origin is not allowed.',
      }));
      return;
    }
    applyCors(res, cors.allowOrigin);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://127.0.0.1:${ctx.getPort()}`);
    const pathname = url.pathname;

    // Minimal public health for lock recovery (design §6.11.3).
    if (req.method === 'GET' && pathname === '/v1/health') {
      sendJson(res, 200, {
        ok: true,
        pid: process.pid,
        port: ctx.getPort(),
        startedBy: ctx.config.startedBy,
        lifetimeMode: ctx.config.lifetimeMode,
        schemaVersion: DATABASE_SCHEMA_VERSION,
        servesAppUi: Boolean(ctx.config.serveStaticDir),
      });
      return;
    }

    // Auth exchange uses one-time code in body (no Bearer required).
    if (req.method === 'POST' && pathname === '/v1/auth/exchange') {
      const body = await readJsonBody(req);
      const parsed = authExchangeRequestSchema.safeParse({
        type: 'auth.exchange',
        ...(body && typeof body === 'object' ? body : {}),
      });
      if (!parsed.success) {
        sendJson(res, 400, errorBody('invalid_payload', 'Invalid auth.exchange payload.'));
        return;
      }
      const token = ctx.auth.exchangeOneTimeCode(parsed.data.oneTimeCode);
      if (!token) {
        ctx.metrics.authFailCount += 1;
        sendJson(res, 401, errorBody('unauthorized', 'Invalid or expired one-time code.'));
        return;
      }
      sendJson(res, 200, { type: 'auth.exchange.ok', token });
      return;
    }

    // All other /v1/* business routes require Bearer process token.
    if (pathname.startsWith('/v1/')) {
      if (!ctx.auth.validateBearer(headerString(req.headers.authorization))) {
        ctx.metrics.authFailCount += 1;
        sendJson(res, 401, errorBody('unauthorized', 'Missing or invalid Bearer token.'));
        return;
      }
      await handleAuthenticated(ctx, req, res, pathname);
      return;
    }

    // Static Web UI (PR3): / and /app/* SPA (design §6.5 / §6.11.3).
    if (req.method === 'GET' && ctx.config.serveStaticDir) {
      if (serveStatic(ctx.config.serveStaticDir, pathname, res)) return;
    }

    sendJson(res, 404, errorBody('not_found', `No route for ${pathname}`));
  } catch (error) {
    if (error instanceof JsonBodyError) {
      sendJson(res, 400, errorBody('invalid_payload', error.message));
      return;
    }
    sendJson(
      res,
      500,
      errorBody('internal_error', error instanceof Error ? error.message : 'Internal error.'),
    );
  }
}

async function handleAuthenticated(
  ctx: RuntimeHttpContext,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  const method = req.method ?? 'GET';

  // Touch registered clients on any authenticated request carrying X-Cardo-Client-Id
  // (idle timeout applies only to non-streaming sessions; design §6.6.1).
  const headerClientId = clientIdFromHeaders(req);
  if (headerClientId && ctx.clients.has(headerClientId)) {
    ctx.clients.touch(headerClientId);
  }

  if (method === 'POST' && pathname === '/v1/auth/bootstrap') {
    const issued = ctx.auth.issueBootstrapCode();
    sendJson(res, 200, {
      type: 'auth.bootstrap.ok',
      oneTimeCode: issued.oneTimeCode,
      expiresInMs: issued.expiresInMs,
    });
    return;
  }

  if (method === 'POST' && pathname === '/v1/hello') {
    const body = await readJsonBody(req);
    const parsed = helloRequestSchema.safeParse({
      type: 'hello',
      ...(body && typeof body === 'object' ? body : {}),
    });
    if (!parsed.success) {
      sendJson(res, 400, errorBody('invalid_payload', 'Invalid hello payload.'));
      return;
    }
    const client = ctx.clients.register(parsed.data.client);
    const revision = await getRevision(ctx.database);
    sendJson(
      res,
      200,
      helloOkSchema.parse({
        type: 'hello.ok',
        clientId: client.id,
        revision,
        schemaVersion: DATABASE_SCHEMA_VERSION,
        auth: { tokenRequired: true },
        features: [],
      }),
    );
    return;
  }

  if (method === 'POST' && pathname === '/v1/session/bye') {
    const body = await readJsonBody(req);
    const parsed = sessionByeRequestSchema.safeParse({
      type: 'session.bye',
      ...(body && typeof body === 'object' ? body : {}),
    });
    if (!parsed.success) {
      sendJson(res, 400, errorBody('invalid_payload', 'Invalid session.bye payload.'));
      return;
    }
    ctx.clients.unregister(parsed.data.clientId);
    sendJson(res, 200, { type: 'session.bye.ok' });
    return;
  }

  if (method === 'POST' && pathname === '/v1/command') {
    const body = await readJsonBody(req);
    const parsed = commandRequestSchema.safeParse({
      type: 'command',
      ...(body && typeof body === 'object' ? body : {}),
    });
    if (!parsed.success) {
      const detail = parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('; ');
      sendJson(
        res,
        400,
        errorBody('invalid_payload', detail ? `Invalid command payload. ${detail}` : 'Invalid command payload.'),
      );
      return;
    }
    const sourceClientId = requireRegisteredClientId(ctx, req, res);
    if (!sourceClientId) return;
    const response = await ctx.queue.enqueue(async () => {
      const execution = await executeDatabaseCommand(ctx.database, parsed.data.command);
      const scopes = execution.mutated ? deriveInvalidationScopes(execution.changes) : [];
      if (execution.mutated && scopes.length > 0) {
        publishMutation(ctx, {
          revision: execution.revision,
          scopes,
          sourceClientId,
        });
      }
      return commandOkSchema.parse({
        type: 'command.ok',
        revision: execution.revision,
        scopes: execution.mutated ? scopes : [],
        result: Object.keys(execution.result).length ? execution.result : undefined,
      });
    });
    sendJson(res, 200, response);
    return;
  }

  if (method === 'POST' && (pathname === '/v1/history/undo' || pathname === '/v1/history/redo')) {
    const sourceClientId = requireRegisteredClientId(ctx, req, res);
    if (!sourceClientId) return;
    const isUndo = pathname.endsWith('/undo');
    const response = await ctx.queue.enqueue(async () => {
      const execution = isUndo
        ? await undoDatabaseCommand(ctx.database)
        : await redoDatabaseCommand(ctx.database);
      const scopes = execution.applied ? deriveInvalidationScopes(execution.changes) : [];
      if (execution.applied && scopes.length > 0) {
        publishMutation(ctx, {
          revision: execution.revision,
          scopes,
          sourceClientId,
        });
      }
      return historyOkSchema.parse({
        type: 'history.ok',
        revision: execution.revision,
        scopes,
        applied: execution.applied,
      });
    });
    sendJson(res, 200, response);
    return;
  }

  if (method === 'POST' && pathname === '/v1/workspace/ensure-initialized') {
    const body = await readJsonBody(req);
    const parsed = ensureInitializedRequestSchema.safeParse({
      type: 'workspace.ensureInitialized',
      ...(body && typeof body === 'object' ? body : {}),
    });
    if (!parsed.success) {
      sendJson(res, 400, errorBody('invalid_payload', 'Invalid ensure-initialized payload.'));
      return;
    }
    const sourceClientId = requireRegisteredClientId(ctx, req, res);
    if (!sourceClientId) return;
    const response = await ctx.queue.enqueue(async () => {
      const { created } = await initializeWorkspaceDatabase(ctx.database, {
        locale: parsed.data.locale,
        colorMode: parsed.data.colorMode,
      });
      const revision = await getRevision(ctx.database);
      if (created) {
        // Seed writes preferences + workspace tables (design §6.8.1).
        const scopes = [
          { type: 'projection' as const },
          { type: 'preferences' as const },
          { type: 'history' as const },
        ];
        publishMutation(ctx, {
          revision,
          scopes,
          sourceClientId,
        });
        return ensureInitializedOkSchema.parse({
          type: 'ensureInitialized.ok',
          created: true,
          revision,
          scopes,
        });
      }
      return ensureInitializedOkSchema.parse({
        type: 'ensureInitialized.ok',
        created: false,
        revision,
      });
    });
    sendJson(res, 200, response);
    return;
  }

  if (method === 'POST' && pathname === '/v1/activity/record') {
    const body = await readJsonBody(req);
    const parsed = activityRecordRequestSchema.safeParse({
      type: 'activity.record',
      ...(body && typeof body === 'object' ? body : {}),
    });
    if (!parsed.success) {
      sendJson(res, 400, errorBody('invalid_payload', 'Invalid activity.record payload.'));
      return;
    }
    await ctx.queue.enqueue(async () => {
      await recordDatabaseActivity(ctx.database, {
        action: parsed.data.action,
        target: parsed.data.target,
        details: parsed.data.details,
      });
    });
    sendJson(res, 200, { type: 'activity.record.ok' });
    return;
  }

  if (method === 'GET' && pathname === '/v1/workspace/export') {
    const workspace = await getWorkspaceProjection(ctx.database);
    const document = workspaceTransferDocumentSchema.parse({
      format: 'cardo-workspace',
      version: WORKSPACE_TRANSFER_VERSION,
      exportedAt: new Date().toISOString(),
      workspace,
    });
    sendJson(res, 200, { type: 'workspace.export.ok', document });
    return;
  }

  if (
    (method === 'GET' || method === 'POST') &&
    pathname === '/v1/workspace/export-operation-log'
  ) {
    const entries = await getOperationLogEntries(ctx.database);
    sendJson(res, 200, { type: 'workspace.exportOperationLog.ok', entries });
    return;
  }

  if (method === 'POST' && pathname === '/v1/capability/open-local-resource') {
    const body = await readJsonBody(req);
    const parsed = openLocalResourceRequestSchema.safeParse({
      type: 'capability.openLocalResource',
      ...(body && typeof body === 'object' ? body : {}),
    });
    if (!parsed.success) {
      sendJson(res, 400, errorBody('invalid_payload', 'Invalid open-local-resource payload.'));
      return;
    }
    const opened = await openLocalResourceViaHooks(ctx.config.hooks, parsed.data.path);
    sendJson(res, 200, { type: 'capability.openLocalResource.ok', opened });
    return;
  }

  if ((method === 'GET' || method === 'POST') && pathname === '/v1/events') {
    await handleEvents(ctx, req, res);
    return;
  }

  if (method === 'GET' && pathname === '/v1/diagnostics') {
    const revision = await getRevision(ctx.database);
    sendJson(res, 200, {
      type: 'diagnostics.ok',
      revision,
      schemaVersion: DATABASE_SCHEMA_VERSION,
      dbPath: ctx.dbPath,
      pid: process.pid,
      startedBy: ctx.config.startedBy,
      lifetimeMode: ctx.config.lifetimeMode,
      baseUrl: ctx.getBaseUrl(),
      authEnabled: true,
      clientCount: ctx.clients.clientCount,
      clients: ctx.clients.list().map((c) => ({
        id: c.id,
        kind: c.kind,
        connectedAt: c.connectedAt,
        lastSeenAt: c.lastSeenAt,
        streaming: c.streaming || ctx.events.isClientStreaming(c.id),
      })),
      queueDepth: ctx.queue.depth,
      lastMutationAt: ctx.metrics.lastMutationAt,
      uptimeMs: Date.now() - ctx.startedAtMs,
      corsRejectedCount: ctx.metrics.corsRejectedCount,
      authFailCount: ctx.metrics.authFailCount,
      graceActive: ctx.clients.graceActive,
    });
    return;
  }

  if (method === 'POST' && pathname === '/v1/shutdown') {
    sendJson(res, 200, { type: 'shutdown.ok' });
    // Defer so the response can flush.
    setImmediate(() => ctx.onShutdown());
    return;
  }

  // Queries: GET /v1/query/<name> or POST /v1/query with body
  if (pathname.startsWith('/v1/query')) {
    await handleQuery(ctx, req, res, pathname);
    return;
  }

  sendJson(res, 404, errorBody('not_found', `No route for ${pathname}`));
}

async function handleQuery(
  ctx: RuntimeHttpContext,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  let queryType: string | null = null;
  let extra: Record<string, unknown> = {};

  if (req.method === 'POST' && pathname === '/v1/query') {
    const body = await readJsonBody(req);
    if (body && typeof body === 'object' && 'type' in body) {
      const parsed = queryRequestSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, errorBody('invalid_payload', 'Invalid query payload.'));
        return;
      }
      await dispatchQuery(ctx, res, parsed.data);
      return;
    }
    sendJson(res, 400, errorBody('invalid_payload', 'Invalid query payload.'));
    return;
  }

  if (req.method === 'GET') {
    const map: Record<string, string> = {
      '/v1/query/workspace-projection': 'query.workspaceProjection',
      '/v1/query/workspace-state': 'query.workspaceState',
      '/v1/query/page-tabs': 'query.pageTabs',
      '/v1/query/preferences': 'query.preferences',
      '/v1/query/history-state': 'query.historyState',
      '/v1/query/operation-log': 'query.operationLog',
      '/v1/query/local-theme-packs': 'query.localThemePacks',
    };
    queryType = map[pathname] ?? null;
    const url = new URL(req.url ?? '/', `http://127.0.0.1`);
    if (pathname === '/v1/query/page-boxes') {
      queryType = 'query.pageBoxes';
      extra = { pageId: url.searchParams.get('pageId') };
    } else if (pathname === '/v1/query/box-items') {
      queryType = 'query.boxItems';
      extra = { boxId: url.searchParams.get('boxId') };
    } else if (pathname === '/v1/query/global-search') {
      queryType = 'query.globalSearch';
      extra = { query: url.searchParams.get('query') ?? '' };
    } else if (pathname === '/v1/query/operation-log') {
      const limit = url.searchParams.get('limit');
      extra = limit ? { limit: Number(limit) } : {};
    }

    if (!queryType) {
      sendJson(res, 404, errorBody('not_found', `No query route for ${pathname}`));
      return;
    }

    const parsed = queryRequestSchema.safeParse({ type: queryType, ...extra });
    if (!parsed.success) {
      sendJson(res, 400, errorBody('invalid_payload', 'Invalid query parameters.'));
      return;
    }
    await dispatchQuery(ctx, res, parsed.data);
    return;
  }

  sendJson(res, 405, errorBody('method_not_allowed', 'Use GET or POST for queries.'));
}

async function dispatchQuery(
  ctx: RuntimeHttpContext,
  res: ServerResponse,
  query: ReturnType<typeof queryRequestSchema.parse>,
): Promise<void> {
  switch (query.type) {
    case 'query.workspaceProjection': {
      const data = await getWorkspaceProjection(ctx.database);
      sendJson(res, 200, { type: 'query.workspaceProjection.ok', data });
      return;
    }
    case 'query.workspaceState': {
      const data = await getWorkspaceState(ctx.database);
      sendJson(res, 200, { type: 'query.workspaceState.ok', data });
      return;
    }
    case 'query.pageTabs': {
      const data = await getPageTabs(ctx.database);
      sendJson(res, 200, { type: 'query.pageTabs.ok', data });
      return;
    }
    case 'query.pageBoxes': {
      const data = await getPageBoxes(ctx.database, query.pageId);
      sendJson(res, 200, { type: 'query.pageBoxes.ok', data });
      return;
    }
    case 'query.boxItems': {
      const data = await getBoxItems(ctx.database, query.boxId);
      sendJson(res, 200, { type: 'query.boxItems.ok', data });
      return;
    }
    case 'query.preferences': {
      const data = await getPreferences(ctx.database);
      sendJson(res, 200, { type: 'query.preferences.ok', data });
      return;
    }
    case 'query.historyState': {
      const data = await getDatabaseHistoryState(ctx.database);
      sendJson(res, 200, { type: 'query.historyState.ok', data });
      return;
    }
    case 'query.globalSearch': {
      const data = await searchWorkspaceDatabase(ctx.database, query.query);
      sendJson(res, 200, { type: 'query.globalSearch.ok', data });
      return;
    }
    case 'query.operationLog': {
      const data = await getOperationLogEntries(ctx.database, query.limit);
      sendJson(res, 200, { type: 'query.operationLog.ok', data });
      return;
    }
    case 'query.localThemePacks': {
      const themesDir = path.join(ctx.config.dataDir, CARDO_THEMES_DIRNAME);
      const entries = scanLocalThemePacks(themesDir);
      sendJson(res, 200, {
        type: 'query.localThemePacks.ok',
        data: entries.map((entry) => entry.pack),
      });
      return;
    }
    default: {
      sendJson(res, 400, errorBody('invalid_payload', 'Unknown query type.'));
    }
  }
}

async function handleEvents(
  ctx: RuntimeHttpContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const clientId = requireRegisteredClientId(ctx, req, res);
  if (!clientId) return;

  ctx.clients.setStreaming(clientId, true);

  const revision = await getRevision(ctx.database);
  const ready: RuntimeEvent = { type: 'ready', revision };

  const subscriberId = ctx.events.subscribe({
    clientId,
    response: res,
    onClose: () => {
      ctx.clients.onStreamClose(clientId);
    },
  });
  ctx.events.send(subscriberId, ready);
}

function publishMutation(
  ctx: RuntimeHttpContext,
  input: {
    revision: number;
    scopes: ReturnType<typeof deriveInvalidationScopes>;
    sourceClientId: string;
  },
): void {
  if (!input.scopes.length) return;
  ctx.metrics.lastMutationAt = new Date().toISOString();
  const event: RuntimeEvent = {
    type: 'mutation',
    revision: input.revision,
    scopes: input.scopes,
    sourceClientId: input.sourceClientId,
  };
  ctx.events.broadcast(event);
}

// --- helpers ---

function headerString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function clientIdFromHeaders(req: IncomingMessage): string | null {
  const raw = headerString(req.headers['x-cardo-client-id']);
  if (!raw) return null;
  if (!/^[0-9a-f-]{36}$/i.test(raw)) return null;
  return raw;
}

/**
 * Mutating routes and events require a registered client id for self-echo / idle tracking.
 * Missing or unregistered header → 400 (no synthetic sourceClientId).
 */
function requireRegisteredClientId(
  ctx: RuntimeHttpContext,
  req: IncomingMessage,
  res: ServerResponse,
): string | null {
  const clientId = clientIdFromHeaders(req);
  if (!clientId || !ctx.clients.has(clientId)) {
    sendJson(
      res,
      400,
      errorBody(
        'invalid_payload',
        'X-Cardo-Client-Id header must reference a client registered via POST /v1/hello.',
      ),
    );
    return null;
  }
  ctx.clients.touch(clientId);
  return clientId;
}

function errorBody(code: string, message: string) {
  return runtimeErrorSchema.parse({ ok: false, code, message });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

class JsonBodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonBodyError';
  }
}

const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    total += buf.byteLength;
    if (total > MAX_JSON_BODY_BYTES) {
      throw new JsonBodyError('Request body exceeds size limit.');
    }
    chunks.push(buf);
  }
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new JsonBodyError('Request body is not valid JSON.');
  }
}

function resolveCors(
  origin: string | undefined,
  runtimePort: number,
): { rejected: boolean; allowOrigin: string | null } {
  if (!origin) {
    return { rejected: false, allowOrigin: null };
  }
  if (
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('moz-extension://') ||
    origin.startsWith('safari-web-extension://')
  ) {
    return { rejected: false, allowOrigin: origin };
  }
  if (
    origin === `http://127.0.0.1:${runtimePort}` ||
    origin === `http://localhost:${runtimePort}`
  ) {
    return { rejected: false, allowOrigin: origin };
  }
  return { rejected: true, allowOrigin: null };
}

function applyCors(res: ServerResponse, allowOrigin: string | null): void {
  if (!allowOrigin) return;
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Cardo-Client-Id');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS',
  );
  res.setHeader('Vary', 'Origin');
  // Allow extension pages (and optional COEP clients) to read Runtime responses (design §6.4.2).
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

/**
 * Serve built web-runtime artifacts.
 * Vite base is `/app/`, so files live under root as `index.html`, `assets/*`.
 * Map:
 *   / → redirect /app/
 *   /app, /app/ → index.html
 *   /app/assets/* → artifacts assets
 *   bare /assets/* also accepted for resilience
 */
function serveStatic(rootDir: string, pathname: string, res: ServerResponse): boolean {
  const resolvedRoot = path.resolve(rootDir);

  if (pathname === '/') {
    res.writeHead(302, { Location: '/app/' });
    res.end();
    return true;
  }

  let relativePath = pathname;
  if (relativePath === '/app' || relativePath === '/app/') {
    relativePath = '/index.html';
  } else if (relativePath.startsWith('/app/')) {
    relativePath = relativePath.slice('/app'.length);
  }

  // Strip query-like junk (pathname from URL is already without search).
  if (relativePath.includes('\0')) {
    sendJson(res, 403, errorBody('forbidden', 'Invalid path.'));
    return true;
  }

  let filePath = path.resolve(resolvedRoot, `.${relativePath}`);
  if (!filePath.startsWith(resolvedRoot)) {
    sendJson(res, 403, errorBody('forbidden', 'Invalid path.'));
    return true;
  }

  // SPA fallback: unknown /app/* paths serve index.html (client-side routes).
  const isAssetLike = path.extname(filePath) !== '';
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (!isAssetLike && (pathname === '/app' || pathname.startsWith('/app/'))) {
      filePath = path.join(resolvedRoot, 'index.html');
      if (!fs.existsSync(filePath)) return false;
    } else {
      return false;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.ico': 'image/x-icon',
    '.map': 'application/json; charset=utf-8',
  };
  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': types[ext] ?? 'application/octet-stream',
    'Content-Length': body.byteLength,
  });
  res.end(body);
  return true;
}
