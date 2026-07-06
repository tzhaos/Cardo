import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  shell,
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

declare const __KHAOSBOX_DEBUG_PACKAGE__: boolean;

const isDebugPackage = __KHAOSBOX_DEBUG_PACKAGE__ || process.env.KHAOSBOX_DEBUG_PACKAGE === '1';
const desktopAppRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let debugLogPath: string | null = null;

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

function getRendererIndexPath() {
  return getDesktopAppPath('renderer', 'assets', 'desktop-shell', 'index.html');
}

function getPreloadScriptPath() {
  return getDesktopAppPath('main', 'preload.cjs');
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
    `$host.UI.RawUI.WindowTitle = 'KhaosBox Debug Log'`,
    `Write-Host 'KhaosBox debug log:'`,
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
      win.webContents.send('window:maximized-change', win.isMaximized());
    }
  };

  win.on('maximize', sendMaximizedState);
  win.on('unmaximize', sendMaximizedState);
  win.on('restore', sendMaximizedState);
}

async function readStateFile() {
  const statePath = path.join(app.getPath('userData'), 'state.json');

  try {
    return JSON.parse(await fsPromises.readFile(statePath, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeStateFile(state: Record<string, string>) {
  const statePath = path.join(app.getPath('userData'), 'state.json');
  await fsPromises.mkdir(path.dirname(statePath), { recursive: true });
  await fsPromises.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function registerIpcHandlers() {
  const getSenderWindow = (event: IpcMainInvokeEvent) =>
    BrowserWindow.fromWebContents(event.sender);

  ipcMain.handle('window:minimize', (event) => {
    getSenderWindow(event)?.minimize();
  });

  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = getSenderWindow(event);

    if (!win) {
      return false;
    }

    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }

    return win.isMaximized();
  });

  ipcMain.handle('window:close', (event) => {
    getSenderWindow(event)?.close();
  });

  ipcMain.handle('window:is-maximized', (event) => Boolean(getSenderWindow(event)?.isMaximized()));

  ipcMain.handle('storage:get', async (_event, name: string) => {
    const state = await readStateFile();
    return state[name] ?? null;
  });

  ipcMain.handle('storage:set', async (_event, name: string, value: string) => {
    const state = await readStateFile();
    state[name] = value;
    await writeStateFile(state);
  });

  ipcMain.handle('storage:remove', async (_event, name: string) => {
    const state = await readStateFile();
    delete state[name];
    await writeStateFile(state);
  });

  ipcMain.handle('clipboard:read-text', () => clipboard.readText());
  ipcMain.handle('clipboard:write-text', (_event, text: string) => clipboard.writeText(text));
  ipcMain.handle('shell:open-external', (_event, url: string) => shell.openExternal(url));
  ipcMain.handle('shell:open-local-resource', async (_event, resourcePath: string) => {
    const normalized = normalizeLocalResourcePath(resourcePath);

    if (!normalized.ok) {
      return { ok: false, error: normalized.errorMessage };
    }

    if (process.platform === 'win32' && !fs.existsSync(normalized.path)) {
      return { ok: false, error: 'Local path does not exist.' };
    }

    const error = await shell.openPath(normalized.path);
    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('dialog:save-json', async (_event, filename: string, payload: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return;
    }

    await fsPromises.writeFile(result.filePath, payload, 'utf8');
  });

  ipcMain.handle('dialog:save-text', async (_event, filename: string, payload: string) => {
    const extension = path.extname(filename).replace(/^\./, '') || 'txt';
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });

    if (result.canceled || !result.filePath) {
      return;
    }

    await fsPromises.writeFile(result.filePath, payload, 'utf8');
  });
}

async function createWindow() {
  const preloadScript = getPreloadScriptPath();
  const rendererIndex = getRendererIndexPath();

  if (!fs.existsSync(preloadScript)) {
    console.error('Preload script is missing', preloadScript);
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    title: 'KhaosBox',
    frame: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadScript,
    },
  });
  registerWindowDebugLogging(win);
  registerWindowStateEvents(win);

  if (process.env.KHAOSBOX_DESKTOP_DEV_SERVER_URL) {
    await win.loadURL(process.env.KHAOSBOX_DESKTOP_DEV_SERVER_URL);
    return;
  }

  await win.loadFile(rendererIndex);
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  registerIpcHandlers();

  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.focus();
    }
  });

  void app
    .whenReady()
    .then(async () => {
      initializeDebugLogging();
      registerDebugProcessHandlers();
      await createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          void createWindow();
        }
      });
    })
    .catch((error: unknown) => {
      console.error(error);
    });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
