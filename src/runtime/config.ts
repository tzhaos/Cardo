import { z } from 'zod';
import { resolveCardoDataPaths } from './paths';

/** Serializable Runtime host config (Zod SoT; design §6.15). */
export const runtimeHostConfigFileSchema = z
  .object({
    dataDir: z.string().min(1),
    dbPath: z.string().min(1),
    host: z.literal('127.0.0.1'),
    port: z.number().int().nonnegative().optional(),
    token: z.string().min(32).optional(),
    startedBy: z.enum(['cli', 'desktop']),
    lifetimeMode: z.enum(['foreground', 'auto']),
    clientGraceMs: z.number().int().positive().default(15_000),
    serveStaticDir: z.string().optional(),
    discoveryPath: z.string().min(1),
    lockPath: z.string().min(1),
    logPath: z.string().optional(),
  })
  .strict();

export type RuntimeHostConfigFile = z.infer<typeof runtimeHostConfigFileSchema>;

/** Process-local DI — not wire Zod. Runtime core must not import electron. */
export interface RuntimeHostHooks {
  openLocalResource(path: string): Promise<boolean>;
}

export type RuntimeHostConfig = RuntimeHostConfigFile & {
  hooks: RuntimeHostHooks;
};

export interface StartRuntimeOptions {
  startedBy: 'cli' | 'desktop';
  lifetimeMode: 'foreground' | 'auto';
  /** Absolute data dir; defaults to shared path resolver. */
  dataDir?: string;
  /** Preferred listen port; 0 or omit = dynamic. */
  port?: number;
  /** Pre-generated process token; generated if omitted. */
  token?: string;
  clientGraceMs?: number;
  serveStaticDir?: string;
  logPath?: string;
  hooks?: Partial<RuntimeHostHooks>;
}

export function buildRuntimeHostConfig(options: StartRuntimeOptions): RuntimeHostConfig {
  const paths = resolveCardoDataPaths(options.dataDir);
  const file = runtimeHostConfigFileSchema.parse({
    dataDir: paths.dataDir,
    dbPath: paths.dbPath,
    host: '127.0.0.1',
    port: options.port ?? 0,
    token: options.token,
    startedBy: options.startedBy,
    lifetimeMode: options.lifetimeMode,
    clientGraceMs: options.clientGraceMs ?? 15_000,
    serveStaticDir: options.serveStaticDir,
    discoveryPath: paths.discoveryPath,
    lockPath: paths.lockPath,
    logPath: options.logPath ?? paths.logPath,
  });

  return {
    ...file,
    hooks: {
      openLocalResource: options.hooks?.openLocalResource ?? (async () => false),
    },
  };
}
