import net from 'node:net';

/** Accept host:port or full URL; always return http:// URL for CONNECT proxies. */
export function normalizeProxyUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      return u.toString().replace(/\/$/, '');
    } catch {
      return null;
    }
  }
  const match = /^([^:\s]+):(\d{1,5})$/.exec(trimmed);
  if (!match) return null;
  const port = Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return `http://${match[1]}:${port}`;
}

export function canConnectTcp(host: string, port: number, timeoutMs = 200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

export function readEnvProxyUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const candidates = [
    env.HTTPS_PROXY,
    env.https_proxy,
    env.HTTP_PROXY,
    env.http_proxy,
    env.ALL_PROXY,
    env.all_proxy,
  ];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return normalizeProxyUrl(trimmed);
  }
  return null;
}
