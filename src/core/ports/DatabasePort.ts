import type { DatabaseExecuteRequest, DatabaseExecuteResponse } from '../contracts/database';

export interface DatabasePort {
  execute(request: DatabaseExecuteRequest): Promise<DatabaseExecuteResponse>;
}
