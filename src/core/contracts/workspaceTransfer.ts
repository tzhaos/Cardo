import { z } from 'zod';
import { workspaceProjectionSchema } from './workspace';

export const WORKSPACE_TRANSFER_VERSION = 1;

export const workspaceTransferDocumentSchema = z
  .object({
    format: z.literal('khaosbox-workspace'),
    version: z.literal(WORKSPACE_TRANSFER_VERSION),
    exportedAt: z.iso.datetime({ offset: true }),
    workspace: workspaceProjectionSchema,
  })
  .strict();

export type WorkspaceTransferDocument = z.infer<typeof workspaceTransferDocumentSchema>;
