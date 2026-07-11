/**
 * Cardo Runtime wire protocol (Zod SoT).
 *
 * PR1 covers multi-client mutation/query/history/export/capability/event shells.
 * Deferred to PR2 (HTTP Runtime host): auth.bootstrap, auth.exchange, shutdown,
 * diagnostics health/status payloads. Do not invent ad-hoc JSON for those — add
 * Zod here when implementing the HTTP surface.
 */
import { z } from 'zod';
import { entityIdSchema, workspaceProjectionSchema } from './workspace';
import { colorModeSchema, preferenceLocaleSchema } from './preferences';
import { workspaceCommandSchema } from './workspaceCommands';
import {
  boxItemsQuerySchema,
  pageBoxesQuerySchema,
  pageTabsQuerySchema,
  workspaceStateQuerySchema,
} from './workspaceQueries';
import { globalSearchResultSchema } from './globalSearch';
import { workspaceTransferDocumentSchema } from './workspaceTransfer';
import { preferencesSelectSchema } from '../database/schema';

// --- Invalidation scopes (server-derived; design §6.9) ---

export const invalidationScopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('projection') }).strict(),
  z.object({ type: z.literal('workspaceState') }).strict(),
  z.object({ type: z.literal('pageTabs') }).strict(),
  z.object({ type: z.literal('pageTabsAndState') }).strict(),
  z.object({ type: z.literal('pageBoxes'), pageId: entityIdSchema }).strict(),
  z.object({ type: z.literal('boxItems'), boxId: entityIdSchema }).strict(),
  z.object({ type: z.literal('preferences') }).strict(),
  z.object({ type: z.literal('history') }).strict(),
]);

export type InvalidationScope = z.infer<typeof invalidationScopeSchema>;

const revisionSchema = z.number().int().nonnegative();
const clientIdSchema = z.string().uuid();

// --- Shared result shells ---

export const databaseCommandResultSchema = z
  .object({
    createdPageId: z.string().optional(),
    createdBoxId: z.string().optional(),
    createdItemId: z.string().optional(),
  })
  .strict();

export const historyStateQuerySchema = z
  .object({
    canUndo: z.boolean(),
    canRedo: z.boolean(),
  })
  .strict();

// --- hello ---

export const helloRequestSchema = z
  .object({
    type: z.literal('hello'),
    client: z.enum(['web', 'extension', 'desktop', 'cli-probe']),
    clientVersion: z.string().min(1),
  })
  .strict();

export const helloOkSchema = z
  .object({
    type: z.literal('hello.ok'),
    clientId: clientIdSchema,
    revision: revisionSchema,
    schemaVersion: z.number().int().positive(),
    auth: z.object({ tokenRequired: z.literal(true) }).strict(),
    features: z.array(z.string()).default([]),
  })
  .strict();

// --- command ---

export const commandRequestSchema = z
  .object({
    type: z.literal('command'),
    baseRevision: revisionSchema.optional(),
    command: workspaceCommandSchema,
  })
  .strict();

export const commandOkSchema = z
  .object({
    type: z.literal('command.ok'),
    revision: revisionSchema,
    scopes: z.array(invalidationScopeSchema),
    result: databaseCommandResultSchema.optional(),
  })
  .strict();

// --- history.undo / history.redo ---

export const historyUndoRequestSchema = z
  .object({
    type: z.literal('history.undo'),
    baseRevision: revisionSchema.optional(),
  })
  .strict();

export const historyRedoRequestSchema = z
  .object({
    type: z.literal('history.redo'),
    baseRevision: revisionSchema.optional(),
  })
  .strict();

export const historyOkSchema = z
  .object({
    type: z.literal('history.ok'),
    revision: revisionSchema,
    scopes: z.array(invalidationScopeSchema),
    applied: z.boolean(),
  })
  .strict();

// --- workspace.ensureInitialized ---

export const ensureInitializedRequestSchema = z
  .object({
    type: z.literal('workspace.ensureInitialized'),
    locale: preferenceLocaleSchema,
    colorMode: colorModeSchema,
  })
  .strict();

export const ensureInitializedOkSchema = z
  .object({
    type: z.literal('ensureInitialized.ok'),
    created: z.boolean(),
    revision: revisionSchema,
    // Required when created === true (design §6.11.2); optional on idempotent no-op.
    scopes: z.array(invalidationScopeSchema).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.created && (value.scopes == null || value.scopes.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'scopes is required and non-empty when created is true',
        path: ['scopes'],
      });
    }
  });

// --- activity.record (never +revision) ---

export const activityRecordRequestSchema = z
  .object({
    type: z.literal('activity.record'),
    action: z.string().min(1),
    target: z.record(z.string(), z.string().optional()).optional(),
    details: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional(),
  })
  .strict();

export const activityRecordOkSchema = z
  .object({
    type: z.literal('activity.record.ok'),
  })
  .strict();

// --- queries ---

export const queryWorkspaceProjectionRequestSchema = z
  .object({ type: z.literal('query.workspaceProjection') })
  .strict();

export const queryWorkspaceStateRequestSchema = z
  .object({ type: z.literal('query.workspaceState') })
  .strict();

export const queryPageTabsRequestSchema = z
  .object({ type: z.literal('query.pageTabs') })
  .strict();

export const queryPageBoxesRequestSchema = z
  .object({
    type: z.literal('query.pageBoxes'),
    pageId: entityIdSchema,
  })
  .strict();

export const queryBoxItemsRequestSchema = z
  .object({
    type: z.literal('query.boxItems'),
    boxId: entityIdSchema,
  })
  .strict();

export const queryPreferencesRequestSchema = z
  .object({ type: z.literal('query.preferences') })
  .strict();

export const queryHistoryStateRequestSchema = z
  .object({ type: z.literal('query.historyState') })
  .strict();

export const queryGlobalSearchRequestSchema = z
  .object({
    type: z.literal('query.globalSearch'),
    query: z.string(),
  })
  .strict();

export const queryOperationLogRequestSchema = z
  .object({
    type: z.literal('query.operationLog'),
    limit: z.number().int().positive().optional(),
  })
  .strict();

export const queryRequestSchema = z.discriminatedUnion('type', [
  queryWorkspaceProjectionRequestSchema,
  queryWorkspaceStateRequestSchema,
  queryPageTabsRequestSchema,
  queryPageBoxesRequestSchema,
  queryBoxItemsRequestSchema,
  queryPreferencesRequestSchema,
  queryHistoryStateRequestSchema,
  queryGlobalSearchRequestSchema,
  queryOperationLogRequestSchema,
]);

export const queryOkSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('query.workspaceProjection.ok'),
      data: workspaceProjectionSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('query.workspaceState.ok'),
      data: workspaceStateQuerySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('query.pageTabs.ok'),
      data: pageTabsQuerySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('query.pageBoxes.ok'),
      data: pageBoxesQuerySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('query.boxItems.ok'),
      data: boxItemsQuerySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('query.preferences.ok'),
      data: preferencesSelectSchema.nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal('query.historyState.ok'),
      data: historyStateQuerySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('query.globalSearch.ok'),
      data: z.array(globalSearchResultSchema),
    })
    .strict(),
  z
    .object({
      type: z.literal('query.operationLog.ok'),
      data: z.array(z.unknown()),
    })
    .strict(),
]);

// --- events ---

export const mutationEventSchema = z
  .object({
    type: z.literal('mutation'),
    revision: z.number().int().positive(),
    scopes: z.array(invalidationScopeSchema).min(1),
    sourceClientId: clientIdSchema,
  })
  .strict();

export const readyEventSchema = z
  .object({
    type: z.literal('ready'),
    revision: revisionSchema,
  })
  .strict();

export const runtimeEventSchema = z.discriminatedUnion('type', [
  mutationEventSchema,
  readyEventSchema,
]);

// --- workspace.export / exportOperationLog ---

export const workspaceExportRequestSchema = z
  .object({ type: z.literal('workspace.export') })
  .strict();

export const workspaceExportOkSchema = z
  .object({
    type: z.literal('workspace.export.ok'),
    document: workspaceTransferDocumentSchema,
  })
  .strict();

export const workspaceExportOperationLogRequestSchema = z
  .object({ type: z.literal('workspace.exportOperationLog') })
  .strict();

export const workspaceExportOperationLogOkSchema = z
  .object({
    type: z.literal('workspace.exportOperationLog.ok'),
    entries: z.array(z.unknown()),
  })
  .strict();

// --- capability ---

export const openLocalResourceRequestSchema = z
  .object({
    type: z.literal('capability.openLocalResource'),
    path: z.string().min(1),
  })
  .strict();

export const openLocalResourceOkSchema = z
  .object({
    type: z.literal('capability.openLocalResource.ok'),
    opened: z.boolean(),
  })
  .strict();

// --- error shape ---

export const runtimeErrorSchema = z
  .object({
    ok: z.literal(false),
    code: z.string().min(1),
    message: z.string(),
  })
  .strict();

// --- inferred types ---

export type HelloRequest = z.infer<typeof helloRequestSchema>;
export type HelloOk = z.infer<typeof helloOkSchema>;
export type CommandRequest = z.infer<typeof commandRequestSchema>;
export type CommandOk = z.infer<typeof commandOkSchema>;
export type HistoryUndoRequest = z.infer<typeof historyUndoRequestSchema>;
export type HistoryRedoRequest = z.infer<typeof historyRedoRequestSchema>;
export type HistoryOk = z.infer<typeof historyOkSchema>;
export type EnsureInitializedRequest = z.infer<typeof ensureInitializedRequestSchema>;
export type EnsureInitializedOk = z.infer<typeof ensureInitializedOkSchema>;
export type ActivityRecordRequest = z.infer<typeof activityRecordRequestSchema>;
export type ActivityRecordOk = z.infer<typeof activityRecordOkSchema>;
export type QueryRequest = z.infer<typeof queryRequestSchema>;
export type QueryOk = z.infer<typeof queryOkSchema>;
export type MutationEvent = z.infer<typeof mutationEventSchema>;
export type ReadyEvent = z.infer<typeof readyEventSchema>;
export type RuntimeEvent = z.infer<typeof runtimeEventSchema>;
export type WorkspaceExportOk = z.infer<typeof workspaceExportOkSchema>;
export type WorkspaceExportOperationLogOk = z.infer<typeof workspaceExportOperationLogOkSchema>;
export type OpenLocalResourceRequest = z.infer<typeof openLocalResourceRequestSchema>;
export type OpenLocalResourceOk = z.infer<typeof openLocalResourceOkSchema>;
export type RuntimeError = z.infer<typeof runtimeErrorSchema>;
