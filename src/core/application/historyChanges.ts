import type { HistoryRowChange, HistoryTable } from '../contracts/history';

export function rowChange<Table extends HistoryTable>(
  table: Table,
  key: Extract<HistoryRowChange, { table: Table }>['key'],
  before: Extract<HistoryRowChange, { table: Table }>['before'],
  after: Extract<HistoryRowChange, { table: Table }>['after'],
): Extract<HistoryRowChange, { table: Table }> {
  return { table, key, before, after } as Extract<HistoryRowChange, { table: Table }>;
}
