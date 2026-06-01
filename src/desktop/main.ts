import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseKbeUrl } from '../core/protocols/kbeUrl';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererIndex = path.resolve(__dirname, '../renderer/index.html');
const preloadScript = path.resolve(__dirname, 'preload.js');
const protocolScheme = 'kbe';

async function readStateFile() {
  const statePath = path.join(app.getPath('userData'), 'state.json');

  try {
    return JSON.parse(await fs.readFile(statePath, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeStateFile(state: Record<string, string>) {
  const statePath = path.join(app.getPath('userData'), 'state.json');
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function registerIpcHandlers() {
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
    const error = await shell.openPath(resourcePath);
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

    await fs.writeFile(result.filePath, payload, 'utf8');
  });
}

function findProtocolUrl(argv: string[]) {
  return argv.find((argument) => argument.startsWith(`${protocolScheme}:`)) ?? null;
}

async function openKbeUrl(input: string) {
  const resourcePath = parseKbeUrl(input);

  if (!resourcePath) {
    return;
  }

  await shell.openPath(resourcePath);
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    title: 'KhaosBox',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadScript,
    },
  });

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
  app.setAsDefaultProtocolClient(protocolScheme);
  registerIpcHandlers();

  app.on('second-instance', (_event, argv) => {
    const protocolUrl = findProtocolUrl(argv);

    if (protocolUrl) {
      void openKbeUrl(protocolUrl);
    }

    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.focus();
    }
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    void openKbeUrl(url);
  });

  void app
    .whenReady()
    .then(async () => {
      const startupProtocolUrl = findProtocolUrl(process.argv);

      if (startupProtocolUrl) {
        void openKbeUrl(startupProtocolUrl);
      }

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
