import type { CardoDatabase } from '../database/createDatabaseClient';
import type { HistoryChangeSet } from '../contracts/history';
import type { DatabaseCommandResult } from '../contracts/runtimeProtocol';

export type { DatabaseCommandResult };

export type DatabaseTransaction = Parameters<Parameters<CardoDatabase['transaction']>[0]>[0];

export interface DatabaseCommandMutation {
  changes: HistoryChangeSet;
  result?: DatabaseCommandResult;
}
