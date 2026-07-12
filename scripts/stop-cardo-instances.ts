/**
 * Stop local Cardo Runtime / Desktop / CLI child processes so builds replace
 * locked binaries and stale servers cannot keep serving old command schemas.
 */
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const isWin = process.platform === 'win32';

const MATCHERS = [
  /artifacts[\\/]+cli[\\/]+cardo\.js/i,
  /cardo\.js\s+serve/i,
  /cardo-native-host/i,
  /artifacts[\\/]+desktop[\\/]+main[\\/]+main\.js/i,
  /artifacts[\\/]+desktop[\\/]+main[\\/]+runtime-child\.js/i,
  /KhaosBox[\\/]+artifacts/i,
  /[\\/]Cardo[\\/].*electron/i,
  /electron.*Cardo/i,
];

function listWindowsProcesses(): Array<{ pid: number; commandLine: string }> {
  const ps = [
    "Get-CimInstance Win32_Process |",
    "Where-Object { $_.Name -match '^(node|electron|cardo)' } |",
    "Select-Object ProcessId, CommandLine |",
    "ConvertTo-Json -Compress",
  ].join(' ');
  const raw = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', ps],
    { encoding: 'utf8', windowsHide: true },
  ).trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw) as
    | { ProcessId: number; CommandLine?: string | null }
    | Array<{ ProcessId: number; CommandLine?: string | null }>;
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .map((row) => ({
      pid: Number(row.ProcessId),
      commandLine: String(row.CommandLine ?? ''),
    }))
    .filter((row) => Number.isFinite(row.pid) && row.pid > 0);
}

function listUnixProcesses(): Array<{ pid: number; commandLine: string }> {
  const raw = execFileSync('ps', ['-ax', '-o', 'pid=,args='], { encoding: 'utf8' });
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(\d+)\s+(.*)$/.exec(line);
      if (!match) return null;
      return { pid: Number(match[1]), commandLine: match[2] };
    })
    .filter((row): row is { pid: number; commandLine: string } => Boolean(row));
}

function shouldStop(commandLine: string): boolean {
  if (!commandLine) return false;
  // Never kill the current build pipeline itself.
  if (commandLine.includes('stop-cardo-instances') || commandLine.includes('build-all')) {
    return false;
  }
  return MATCHERS.some((re) => re.test(commandLine));
}

function killPid(pid: number): void {
  if (pid === process.pid || pid === process.ppid) return;
  try {
    if (isWin) {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // already exited
  }
}

function freeRuntimePorts(): void {
  // Common Cardo Runtime loopback ports (default + nearby).
  const ports = [5261, 5260, 5262, 4173];
  if (!isWin) return;
  for (const port of ports) {
    try {
      const raw = execFileSync('netstat', ['-ano'], { encoding: 'utf8', windowsHide: true });
      const pids = new Set<number>();
      for (const line of raw.split(/\r?\n/)) {
        if (!line.includes(`:${port}`) || !line.includes('LISTENING')) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
      }
      for (const pid of pids) {
        // Only kill if it looks like node/electron (avoid killing random listeners).
        try {
          const info = execFileSync(
            'powershell.exe',
            [
              '-NoProfile',
              '-NonInteractive',
              '-Command',
              `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
            ],
            { encoding: 'utf8', windowsHide: true },
          ).trim();
          if (shouldStop(info) || /node|electron|cardo/i.test(info)) {
            console.log(`  free :${port} pid=${pid}`);
            killPid(pid);
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }
}

function main() {
  console.log('Stopping Cardo instances…');
  const rows = isWin ? listWindowsProcesses() : listUnixProcesses();
  const targets = rows.filter((row) => shouldStop(row.commandLine));
  if (targets.length === 0) {
    console.log('  no matching processes');
  } else {
    for (const row of targets) {
      console.log(`  kill pid=${row.pid} ${row.commandLine.slice(0, 140)}`);
      killPid(row.pid);
    }
  }
  freeRuntimePorts();
  console.log('Cardo instances cleared.');
}

main();
