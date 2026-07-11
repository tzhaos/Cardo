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
  desktopRuntimeConfigSchema,
  desktopSaveFileRequestSchema,
  desktopTextResponseSchema,
  desktopUrlRequestSchema,
  desktopVoidResponseSchema,
  desktopWebsiteIconResponseSchema,
  type DesktopRuntimeConfig,
} from '../core/contracts/desktopIpc';

declare const __CARDO_DEBUG_PACKAGE__: boolean;

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

function registerDebugProcessHandlers() {
  if (!isDebugPackage) {
    return;
  }

  process.on('uncaughtExceptionMonitor', (error) => {
    console.error('Uncaught exception', error);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection', reason);
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

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  const windowVisible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: windowVisible ? '隐藏 Cardo' : '显示 Cardo',
        click: () => toggleMainWindow(),
      },
      { type: 'separator' },
      {
        // Design §6.6.1: default quit unregisters this client only; does not kill others' Runtime.
        label: '退出',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
      {
        label: '退出并停止 Runtime',
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
    await shell.openExternal(desktopUrlRequestSchema.parse(input).url);
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
}

async function createWindow() {
  const preloadScript = getPreloadScriptPath();

  if (!fs.existsSync(preloadScript)) {
    console.error('Preload script is missing', preloadScript);
  }

  if (!runtimeConnection) {
    throw new Error('createWindow requires Runtime connection (ensureDesktopRuntime first).');
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    title: 'Cardo',
    frame: false,
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
      registerDebugProcessHandlers();

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

      await createWindow();
      createTray();

      app.on('activate', () => {
        showMainWindow();
      });
    })
    .catch((error: unknown) => {
      console.error(error);
    });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('will-quit', () => {
    // Attach / detached embed: never stop Runtime on quit (design §6.6.1).
    // Other clients may still be connected; auto lifetime + grace handles last-client stop.
    // Force-stop is only via tray 「退出并停止 Runtime」 → /v1/shutdown.
    tray?.destroy();
    tray = null;
  });

  app.on('window-all-closed', () => {
    if (isQuitting) {
      return;
    }
  });
}
