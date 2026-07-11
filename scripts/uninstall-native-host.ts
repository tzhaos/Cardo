import { execFileSync } from 'node:child_process';
import { CARDO_NATIVE_HOST_NAME } from '../src/core/protocols/nativeMessaging';

const WINDOWS_BROWSER_NATIVE_HOST_KEYS = [
  'Google\\Chrome',
  'Google\\Chrome Beta',
  'Google\\Chrome Dev',
  'Google\\Chrome SxS',
  'Microsoft\\Edge',
  'Microsoft\\Edge Beta',
  'Microsoft\\Edge Dev',
  'Microsoft\\Edge SxS',
] as const;

function deleteWindowsNativeHost(browserKey: string, hostName: string) {
  try {
    execFileSync('reg', [
      'delete',
      `HKCU\\Software\\${browserKey}\\NativeMessagingHosts\\${hostName}`,
      '/f',
    ]);
  } catch {
    // Missing registrations are already uninstalled.
  }
}

function main() {
  if (process.platform !== 'win32') {
    throw new Error('Native host uninstaller currently supports Windows registry registration.');
  }

  for (const browserKey of WINDOWS_BROWSER_NATIVE_HOST_KEYS) {
    deleteWindowsNativeHost(browserKey, CARDO_NATIVE_HOST_NAME);
  }
  console.log(`Unregistered ${CARDO_NATIVE_HOST_NAME}`);
}

main();
