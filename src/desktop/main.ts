import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
  type Event,
  type IpcMainInvokeEvent,
  type WebContentsConsoleMessageEventParams,
} from 'electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATABASE_SCHEMA_VERSION } from '../core/database/version';
import { normalizeLocalResourcePath } from '../core/services/localResourcePath';
import { CARDO_USER_DATA_DIR_NAME } from '../runtime/paths';
import {
  ensureDesktopRuntime,
  forceStopDesktopRuntime,
  type DesktopRuntimeConnection,
} from './ensureDesktopRuntime';
import {
  desktopBooleanResponseSchema,
  desktopClipboardWriteRequestSchema,
  desktopLocalResourceRequestSchema,
  desktopLocalResourceResponseSchema,
  desktopOpenPathRequestSchema,
  desktopOpenPathResponseSchema,
  desktopRuntimeConfigSchema,
  desktopSaveFileRequestSchema,
  desktopTextResponseSchema,
  desktopUpdateInstallResultSchema,
  desktopUpdateStateSchema,
  desktopUrlRequestSchema,
  desktopVoidResponseSchema,
  desktopWebsiteIconResponseSchema,
  updateProxySettingsSchema,
  type DesktopRuntimeConfig,
} from '../core/contracts/desktopIpc';
import { DesktopUpdater } from './update/desktopUpdater';
import { ensurePackagedNativeHostRegistered } from './registerNativeHost';
import { readUpdateProxySettings, writeUpdateProxySettings } from './update/updateProxySettings';

declare const __CARDO_DEBUG_PACKAGE__: boolean;
declare const __APP_VERSION__: string;

// Align Electron userData with shared path resolver (`cardo`), not productName casing.
// Must run before getPath('userData') / single-instance.
app.setName(CARDO_USER_DATA_DIR_NAME);

const isDebugPackage = __CARDO_DEBUG_PACKAGE__ || process.env.CARDO_DEBUG_PACKAGE === '1';
const desktopAppRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let debugLogPath: string | null = null;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
/** Attach-first Runtime connection for preload injection (design §6.6). */
let runtimeConnection: DesktopRuntimeConnection | null = null;
let runtimeConfigForRenderer: DesktopRuntimeConfig | null = null;
const desktopUpdater = new DesktopUpdater();
let unsubscribeUpdater: (() => void) | null = null;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const originalConsole = {
  debug: console.debug.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
};

function getDesktopAppPath(...segments: string[]) {
  return path.join(desktopAppRoot, ...segments);
}

function getPreloadScriptPath() {
  return getDesktopAppPath('main', 'preload.cjs');
}

/** Same-origin Runtime-hosted UI (design §6.4.2 / §6.5). Never file:// for business RuntimeClient. */
function getRuntimeAppUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/app/`;
}

function getTrayIconPath() {
  return getDesktopAppPath('main', 'tray-icon.png');
}

function getAppIconPath() {
  return getDesktopAppPath('main', 'app-icon.png');
}

function formatLogValue(value: unknown): string {
  if (value instanceof Error) {
    return `${value.stack ?? value.name}: ${value.message}`;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function writeDebugLog(level: LogLevel, source: string, values: unknown[]) {
  if (!debugLogPath) {
    return;
  }

  const timestamp = new Date().toISOString();
  const message = values.map(formatLogValue).join(' ');

  try {
    fs.appendFileSync(
      debugLogPath,
      `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message}\n`,
    );
  } catch (error) {
    originalConsole.error('Failed to write debug log', error);
  }
}

function patchConsoleForDebugLog() {
  console.debug = (...values: unknown[]) => {
    writeDebugLog('debug', 'main', values);
    originalConsole.debug(...values);
  };
  console.info = (...values: unknown[]) => {
    writeDebugLog('info', 'main', values);
    originalConsole.info(...values);
  };
  console.log = (...values: unknown[]) => {
    writeDebugLog('info', 'main', values);
    originalConsole.log(...values);
  };
  console.warn = (...values: unknown[]) => {
    writeDebugLog('warn', 'main', values);
    originalConsole.warn(...values);
  };
  console.error = (...values: unknown[]) => {
    writeDebugLog('error', 'main', values);
    originalConsole.error(...values);
  };
}

function openDebugLogTerminal(logPath: string) {
  if (process.platform !== 'win32') {
    console.info(`Debug package log: ${logPath}`);
    return;
  }

  const command = [
    `$host.UI.RawUI.WindowTitle = 'Cardo Debug Log'`,
    `Write-Host 'Cardo debug log:'`,
    `Write-Host '${logPath.replaceAll("'", "''")}'`,
    `Write-Host ''`,
    `Get-Content -LiteralPath '${logPath.replaceAll("'", "''")}' -Wait`,
  ].join('; ');

  spawn('powershell.exe', ['-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  }).unref();
}

function initializeDebugLogging() {
  if (!isDebugPackage) {
    return;
  }

  const logDirectory = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDirectory, { recursive: true });
  debugLogPath = path.join(logDirectory, 'debug.log');
  fs.writeFileSync(debugLogPath, `[${new Date().toISOString()}] [INFO] [main] Debug log started\n`);
  patchConsoleForDebugLog();
  openDebugLogTerminal(debugLogPath);
}

/**
 * Process-level crash surfaces for all Desktop builds (packaged production + debug).
 * Debug package still patches console → userData/logs/debug.log; production also
 * appends crash lines to userData/logs/main.log when possible.
 */
function registerProcessHandlers() {
  const writeCrashLog = (label: string, value: unknown) => {
    console.error(label, value);

    try {
      const logDirectory = path.join(app.getPath('userData'), 'logs');
      fs.mkdirSync(logDirectory, { recursive: true });
      const crashLogPath = path.join(logDirectory, 'main.log');
      const message =
        value instanceof Error ? (value.stack ?? `${value.name}: ${value.message}`) : String(value);
      fs.appendFileSync(
        crashLogPath,
        `[${new Date().toISOString()}] [ERROR] [main] ${label}: ${message}\n`,
      );
    } catch {
      // ignore log write failures
    }
  };

  process.on('uncaughtExceptionMonitor', (error) => {
    writeCrashLog('Uncaught exception', error);
  });
  process.on('unhandledRejection', (reason) => {
    writeCrashLog('Unhandled rejection', reason);
  });
}

function registerWindowDebugLogging(win: BrowserWindow) {
  if (!isDebugPackage) {
    return;
  }

  const consoleLevels: Record<number, LogLevel> = {
    0: 'debug',
    1: 'info',
    2: 'warn',
    3: 'error',
  };

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const details = event as Event<WebContentsConsoleMessageEventParams>;
    writeDebugLog(consoleLevels[level] ?? 'info', 'renderer', [
      details.message || message,
      `${details.sourceId || sourceId}:${details.lineNumber || line}`,
    ]);
  });
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Renderer failed to load', { errorCode, errorDescription, validatedURL });
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone', details);
  });
  win.on('unresponsive', () => {
    console.warn('Renderer window became unresponsive');
  });
  win.on('responsive', () => {
    console.info('Renderer window became responsive');
  });
}

function registerWindowStateEvents(win: BrowserWindow) {
  const sendMaximizedState = () => {
    if (!win.isDestroyed()) {
      win.webContents.send(
        'window:maximized-change',
        desktopBooleanResponseSchema.parse(win.isMaximized()),
      );
    }
  };

  win.on('maximize', sendMaximizedState);
  win.on('unmaximize', sendMaximizedState);
  win.on('restore', sendMaximizedState);
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    void createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
  updateTrayMenu();
}

function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
  updateTrayMenu();
}

function toggleMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
    showMainWindow();
  } else {
    hideMainWindow();
  }
}

/** Pre-UI surfaces (tray, native dialogs) use OS locale; zh* → Chinese, else English. */
function isChineseLocale(): boolean {
  return app.getLocale().toLowerCase().startsWith('zh');
}

function getTrayLabels(windowVisible: boolean): {
  toggle: string;
  quit: string;
  quitAndStop: string;
} {
  if (isChineseLocale()) {
    return {
      toggle: windowVisible ? '隐藏 Cardo' : '显示 Cardo',
      quit: '退出',
      quitAndStop: '退出并停止本机服务',
    };
  }

  return {
    toggle: windowVisible ? 'Hide Cardo' : 'Show Cardo',
    quit: 'Quit',
    quitAndStop: 'Quit and stop local service',
  };
}

function isAllowedExternalUrl(urlValue: string): boolean {
  try {
    const protocol = new URL(urlValue).protocol;
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

function formatStartupFailureDialog(error: unknown): { title: string; body: string } {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const schemaVersion = DATABASE_SCHEMA_VERSION;
  const zh = isChineseLocale();

  if (zh) {
    const primary =
      '建议：\n' +
      '1. 完全退出其他 Cardo 窗口与托盘图标后重试\n' +
      '2. 若问题持续，请重新安装同一版本的 Cardo\n' +
      '3. 避免同时使用不同版本的安装\n';
    const technical =
      '\n技术详情：\n' +
      `数据目录：%APPDATA%\\cardo\n` +
      `discovery.json 的 schemaVersion 应为 ${schemaVersion}\n` +
      '日志：%APPDATA%\\cardo\\runtime.log 与 logs\\main.log\n' +
      (app.isPackaged
        ? ''
        : '开发环境可尝试：cardo stop（或 node artifacts/cli/cardo.js stop），然后 npm run desktop:build\n') +
      `\n${detail}`;
    return { title: 'Cardo 无法启动', body: primary + technical };
  }

  const primary =
    'Try the following:\n' +
    '1. Quit any other Cardo window or tray icon, then try again\n' +
    '2. If the problem continues, reinstall the same version of Cardo\n' +
    '3. Avoid mixing installs from different versions\n';
  const technical =
    '\nTechnical details:\n' +
    `Data folder: %APPDATA%\\cardo\n` +
    `discovery.json schemaVersion should be ${schemaVersion}\n` +
    'Logs: %APPDATA%\\cardo\\runtime.log and logs\\main.log\n' +
    (app.isPackaged
      ? ''
      : 'Dev recovery: cardo stop (or node artifacts/cli/cardo.js stop), then npm run desktop:build\n') +
    `\n${detail}`;
  return { title: 'Cardo could not start', body: primary + technical };
}

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  const windowVisible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
  const labels = getTrayLabels(windowVisible);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: labels.toggle,
        click: () => toggleMainWindow(),
      },
      { type: 'separator' },
      {
        // Design §6.6.1: default quit unregisters this client only; does not stop shared local service.
        label: labels.quit,
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
      {
        label: labels.quitAndStop,
        click: () => {
          void (async () => {
            if (runtimeConnection) {
              await forceStopDesktopRuntime(runtimeConnection);
            }
            isQuitting = true;
            app.quit();
          })();
        },
      },
    ]),
  );
}

function createTray() {
  if (tray) {
    return;
  }

  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    console.error('Tray icon is missing', iconPath);
    return;
  }

  tray = new Tray(icon);
  tray.setToolTip('Cardo');
  tray.on('click', toggleMainWindow);
  updateTrayMenu();
}

async function resolveWebsiteIcon(urlValue: string) {
  try {
    const pageUrl = new URL(urlValue);
    if (pageUrl.protocol !== 'http:' && pageUrl.protocol !== 'https:') return null;
    const response = await fetch(new URL('/favicon.ico', pageUrl), {
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Cardo/1.0' },
    });
    if (!response.ok) return null;
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > 256 * 1024) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 256 * 1024) return null;
    const image = nativeImage.createFromBuffer(buffer);
    if (image.isEmpty()) return null;
    return image.resize({ width: 32, height: 32, quality: 'best' }).toDataURL();
  } catch {
    return null;
  }
}

function registerIpcHandlers() {
  const getSenderWindow = (event: IpcMainInvokeEvent) =>
    BrowserWindow.fromWebContents(event.sender);

  // Sync channel: preload injects window.__CARDO_RUNTIME__ before page scripts (PR4).
  ipcMain.on('runtime:get-config', (event) => {
    event.returnValue = runtimeConfigForRenderer;
  });

  ipcMain.handle('window:minimize', (event) => {
    getSenderWindow(event)?.minimize();
    return desktopVoidResponseSchema.parse(undefined);
  });

  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = getSenderWindow(event);

    if (!win) {
      return desktopBooleanResponseSchema.parse(false);
    }

    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }

    return desktopBooleanResponseSchema.parse(win.isMaximized());
  });

  ipcMain.handle('window:close', (event) => {
    getSenderWindow(event)?.close();
    return desktopVoidResponseSchema.parse(undefined);
  });

  ipcMain.handle('window:is-maximized', (event) =>
    desktopBooleanResponseSchema.parse(Boolean(getSenderWindow(event)?.isMaximized())),
  );

  ipcMain.handle('clipboard:read-text', () =>
    desktopTextResponseSchema.parse(clipboard.readText()),
  );
  ipcMain.handle('clipboard:write-text', (_event, input: unknown) => {
    clipboard.writeText(desktopClipboardWriteRequestSchema.parse(input).text);
    return desktopVoidResponseSchema.parse(undefined);
  });
  ipcMain.handle('shell:open-external', async (_event, input: unknown) => {
    const { url } = desktopUrlRequestSchema.parse(input);
    if (!isAllowedExternalUrl(url)) {
      throw new Error('Only http:, https:, and mailto: URLs can be opened externally.');
    }
    await shell.openExternal(url);
    return desktopVoidResponseSchema.parse(undefined);
  });
  ipcMain.handle('website-icon:resolve', async (_event, input: unknown) =>
    desktopWebsiteIconResponseSchema.parse(
      await resolveWebsiteIcon(desktopUrlRequestSchema.parse(input).url),
    ),
  );
  ipcMain.handle('shell:open-local-resource', async (_event, input: unknown) => {
    const { resourcePath } = desktopLocalResourceRequestSchema.parse(input);
    const normalized = normalizeLocalResourcePath(resourcePath);

    if (!normalized.ok) {
      return desktopLocalResourceResponseSchema.parse({
        ok: false,
        error: normalized.errorMessage,
      });
    }

    if (process.platform === 'win32' && !fs.existsSync(normalized.path)) {
      return desktopLocalResourceResponseSchema.parse({
        ok: false,
        error: 'Local path does not exist.',
      });
    }

    const error = await shell.openPath(normalized.path);
    return desktopLocalResourceResponseSchema.parse(error ? { ok: false, error } : { ok: true });
  });

  ipcMain.handle('dialog:open-path', async (_event, input: unknown) => {
    const { directory } = desktopOpenPathRequestSchema.parse(input ?? {});
    const result = await dialog.showOpenDialog({
      properties: directory ? ['openDirectory'] : ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) {
      return desktopOpenPathResponseSchema.parse(null);
    }
    return desktopOpenPathResponseSchema.parse(result.filePaths[0]);
  });

  ipcMain.handle('dialog:save-json', async (_event, input: unknown) => {
    const { filename, payload } = desktopSaveFileRequestSchema.parse(input);
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return desktopVoidResponseSchema.parse(undefined);
    }

    await fsPromises.writeFile(result.filePath, payload, 'utf8');
    return desktopVoidResponseSchema.parse(undefined);
  });

  ipcMain.handle('dialog:save-text', async (_event, input: unknown) => {
    const { filename, payload } = desktopSaveFileRequestSchema.parse(input);
    const extension = path.extname(filename).replace(/^\./, '') || 'txt';
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });

    if (result.canceled || !result.filePath) {
      return desktopVoidResponseSchema.parse(undefined);
    }

    await fsPromises.writeFile(result.filePath, payload, 'utf8');
    return desktopVoidResponseSchema.parse(undefined);
  });

  ipcMain.handle('update:get-state', () =>
    desktopUpdateStateSchema.parse(desktopUpdater.getState()),
  );
  ipcMain.handle('update:check', async () =>
    desktopUpdateStateSchema.parse(await desktopUpdater.checkForUpdates()),
  );
  ipcMain.handle('update:download', async () =>
    desktopUpdateStateSchema.parse(await desktopUpdater.downloadUpdate()),
  );
  ipcMain.handle('update:cancel-download', () =>
    desktopUpdateStateSchema.parse(desktopUpdater.cancelDownload()),
  );
  ipcMain.handle('update:install', async () =>
    desktopUpdateInstallResultSchema.parse(await desktopUpdater.installUpdate()),
  );
  ipcMain.handle('update:open-release-page', async () => {
    await desktopUpdater.openReleasePage();
    return desktopVoidResponseSchema.parse(undefined);
  });
  ipcMain.handle('update:get-proxy-settings', () =>
    updateProxySettingsSchema.parse(readUpdateProxySettings()),
  );
  ipcMain.handle('update:set-proxy-settings', (_event, payload: unknown) =>
    updateProxySettingsSchema.parse(writeUpdateProxySettings(payload)),
  );
}

let forceUpdatePromptInFlight = false;

function broadcastUpdateState() {
  unsubscribeUpdater?.();
  unsubscribeUpdater = desktopUpdater.subscribe((state) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('update:state', state);
      }
    }
    void maybePromptForceUpdate(state);
  });
}

async function maybePromptForceUpdate(state: {
  forceUpdate: boolean;
  phase: string;
  available: { version: string } | null;
}): Promise<void> {
  if (!state.forceUpdate || state.phase !== 'available' || !state.available) return;
  if (forceUpdatePromptInFlight) return;
  forceUpdatePromptInFlight = true;
  try {
    const zh = isChineseLocale();
    const result = await dialog.showMessageBox({
      type: 'warning',
      buttons: [
        zh ? '下载并安装更新' : 'Download and install',
        zh ? '稍后（仍须更新）' : 'Later (still required)',
      ],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: zh ? '必须更新 Cardo' : 'Cardo update required',
      message: zh
        ? '当前版本已不再受支持，请安装更新后继续使用。'
        : 'This version is no longer supported. Install the update to continue.',
      detail: zh
        ? `可用版本：v${state.available.version}`
        : `Available version: v${state.available.version}`,
    });
    if (result.response === 0) {
      void desktopUpdater.downloadUpdate().catch((error: unknown) => {
        console.warn(
          '[Cardo] Force update download failed:',
          error instanceof Error ? error.message : String(error),
        );
      });
    }
  } finally {
    // Allow re-prompt after user dismisses if they still have not updated.
    forceUpdatePromptInFlight = false;
  }
}

async function createWindow() {
  const preloadScript = getPreloadScriptPath();

  if (!fs.existsSync(preloadScript)) {
    console.error('Preload script is missing', preloadScript);
  }

  if (!runtimeConnection) {
    throw new Error('createWindow requires Runtime connection (ensureDesktopRuntime first).');
  }

  const appIconPath = getAppIconPath();
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    title: 'Cardo',
    frame: false,
    ...(fs.existsSync(appIconPath) ? { icon: appIconPath } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadScript,
    },
  });
  mainWindow = win;
  registerWindowDebugLogging(win);
  registerWindowStateEvents(win);
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideMainWindow();
    }
  });
  win.on('show', updateTrayMenu);
  win.on('hide', updateTrayMenu);
  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
    updateTrayMenu();
  });

  // Same-origin with Runtime HTTP so RuntimeClient is not blocked by CORS (design §6.4.2).
  // Token stays in preload memory (__CARDO_RUNTIME__), never in the URL.
  const appUrl = getRuntimeAppUrl(runtimeConnection.baseUrl);
  console.info(`[Cardo] Loading Desktop UI from Runtime ${appUrl}`);
  await win.loadURL(appUrl);
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  app.setAppUserModelId('com.cardo.desktop');
  registerIpcHandlers();

  app.on('second-instance', () => {
    showMainWindow();
  });

  void app
    .whenReady()
    .then(async () => {
      initializeDebugLogging();
      registerProcessHandlers();

      // Attach-first, embed-if-missing before any renderer load (design §6.6).
      runtimeConnection = await ensureDesktopRuntime({ desktopAppRoot });
      runtimeConfigForRenderer = desktopRuntimeConfigSchema.parse({
        baseUrl: runtimeConnection.baseUrl,
        token: runtimeConnection.token,
        client: 'desktop',
      });
      console.info(
        `[Cardo] Desktop Runtime mode=${runtimeConnection.mode} baseUrl=${runtimeConnection.baseUrl}`,
      );

      const nativeHost = ensurePackagedNativeHostRegistered();
      console.info(`[Cardo] Native host: ${nativeHost.message}`);

      await createWindow();
      createTray();
      broadcastUpdateState();
      desktopUpdater.scheduleStartupCheck();

      app.on('activate', () => {
        showMainWindow();
      });
    })
    .catch(async (error: unknown) => {
      console.error(error);
      const { title, body } = formatStartupFailureDialog(error);
      dialog.showErrorBox(title, body);
      app.quit();
    });

  app.on('before-quit', () => {
    isQuitting = true;
    desktopUpdater.dispose();
    unsubscribeUpdater?.();
    unsubscribeUpdater = null;
  });

  app.on('will-quit', () => {
    // Attach / detached embed: never stop local service on quit (design §6.6.1).
    // Other clients may still be connected; auto lifetime + grace handles last-client stop.
    // Force-stop is only via tray "Quit and stop local service" → /v1/shutdown.
    tray?.destroy();
    tray = null;
  });

  app.on('window-all-closed', () => {
    if (isQuitting) {
      return;
    }
  });
}
