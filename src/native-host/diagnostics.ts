import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR =
  process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA ?? process.cwd(), 'KhaosBox')
    : path.join(process.env.HOME ?? process.cwd(), '.khaosbox');

const LOG_PATH = path.join(LOG_DIR, 'native-host.log');

export function writeNativeHostDiagnostic(message: string) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${message}\n`, 'utf8');
  } catch {
    // Diagnostics must never interfere with native messaging.
  }
}
