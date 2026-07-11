import fs from 'node:fs';
import path from 'node:path';
import { CARDO_USER_DATA_DIR_NAME } from '../runtime/paths';

const LOG_DIR =
  process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA ?? process.cwd(), CARDO_USER_DATA_DIR_NAME)
    : path.join(process.env.HOME ?? process.cwd(), `.${CARDO_USER_DATA_DIR_NAME}`);

const LOG_PATH = path.join(LOG_DIR, 'native-host.log');

export function writeNativeHostDiagnostic(message: string) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${message}\n`, 'utf8');
  } catch {
    // Diagnostics must never interfere with native messaging.
  }
}
