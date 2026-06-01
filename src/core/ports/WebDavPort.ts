export interface WebDavSyncConfig {
  endpoint: string;
  username: string;
  password: string;
  remoteFilePath: string;
}

export interface WebDavPort {
  testConnection(config: WebDavSyncConfig): Promise<void>;
  upload(config: WebDavSyncConfig, payload: string): Promise<void>;
  download(config: WebDavSyncConfig): Promise<string>;
}
