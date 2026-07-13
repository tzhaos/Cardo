import { app, shell } from 'electron';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  desktopUpdateStateSchema,
  type DesktopUpdateAvailableInfo,
  type DesktopUpdateInstallResult,
  type DesktopUpdateState,
} from '../../core/contracts/desktopUpdate';
import { normalizeProductSemver } from '../../core/version/semver';
import {
  downloadInstaller,
  fetchLatestStableUpdate,
  UpdateFetchError,
} from './githubReleaseClient';
import { detectInstallChannel, type DesktopInstallChannelInfo } from './installChannel';
import { shouldForceClientUpdate } from './releasePolicy';

type StateListener = (state: DesktopUpdateState) => void;

function readCurrentVersion(): string {
  const fromApp = normalizeProductSemver(app.getVersion());
  if (fromApp) return fromApp;
  if (typeof __APP_VERSION__ !== 'undefined') {
    const fromDefine = normalizeProductSemver(__APP_VERSION__);
    if (fromDefine) return fromDefine;
  }
  return '0.0.0';
}

/**
 * Desktop GitHub Release updater with Setup vs Portable install channels.
 */
export class DesktopUpdater {
  private state: DesktopUpdateState;
  private readonly listeners = new Set<StateListener>();
  private readonly install: DesktopInstallChannelInfo;
  private checkPromise: Promise<DesktopUpdateState> | null = null;
  private downloadPromise: Promise<DesktopUpdateState> | null = null;
  private downloadAbort: AbortController | null = null;
  private autoCheckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.install = detectInstallChannel();
    this.state = desktopUpdateStateSchema.parse({
      phase: app.isPackaged ? 'idle' : 'unsupported',
      currentVersion: readCurrentVersion(),
      channel: 'github-stable',
      installChannel: this.install.channel,
      available: null,
      downloadPercent: null,
      downloadedBytes: null,
      totalBytes: null,
      installerPath: null,
      errorMessage: null,
      checkedAt: null,
      autoCheckEnabled: true,
      isPackaged: app.isPackaged,
      forceUpdate: false,
    });
  }

  getState(): DesktopUpdateState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(patch: Partial<DesktopUpdateState>) {
    this.state = desktopUpdateStateSchema.parse({ ...this.state, ...patch });
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  scheduleStartupCheck(delayMs = 8_000): void {
    if (!this.state.isPackaged || !this.state.autoCheckEnabled) return;
    if (this.autoCheckTimer) clearTimeout(this.autoCheckTimer);
    this.autoCheckTimer = setTimeout(() => {
      void this.checkForUpdates().catch((error: unknown) => {
        console.warn(
          '[Cardo] Startup update check failed:',
          error instanceof Error ? error.message : String(error),
        );
      });
    }, delayMs);
  }

  dispose(): void {
    if (this.autoCheckTimer) {
      clearTimeout(this.autoCheckTimer);
      this.autoCheckTimer = null;
    }
    this.downloadAbort?.abort();
    this.downloadAbort = null;
    this.listeners.clear();
  }

  async checkForUpdates(): Promise<DesktopUpdateState> {
    if (!this.state.isPackaged || this.install.channel === 'dev') {
      this.setState({
        phase: 'unsupported',
        errorMessage: 'Updates are only available in packaged Desktop builds.',
        checkedAt: new Date().toISOString(),
      });
      return this.state;
    }

    if (this.checkPromise) return this.checkPromise;

    this.checkPromise = this.runCheck().finally(() => {
      this.checkPromise = null;
    });
    return this.checkPromise;
  }

  private async runCheck(): Promise<DesktopUpdateState> {
    this.setState({
      phase: 'checking',
      errorMessage: null,
      downloadPercent: null,
      downloadedBytes: null,
      totalBytes: null,
    });

    try {
      const available = await fetchLatestStableUpdate({
        currentVersion: this.state.currentVersion,
        installChannel: this.install.channel,
      });
      const checkedAt = new Date().toISOString();
      if (!available) {
        this.setState({
          phase: 'upToDate',
          available: null,
          installerPath: null,
          checkedAt,
          errorMessage: null,
          forceUpdate: false,
        });
        return this.state;
      }

      const forceUpdate = shouldForceClientUpdate({
        currentVersion: this.state.currentVersion,
        availableVersion: available.version,
        policy: {
          minClientVersion: available.minClientVersion ?? null,
          forceUpdateFlag: available.forceUpdateFromNotes === true,
        },
      });

      this.setState({
        phase: 'available',
        available,
        installerPath: null,
        checkedAt,
        errorMessage: null,
        forceUpdate,
      });
      return this.state;
    } catch (error) {
      const message =
        error instanceof UpdateFetchError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      this.setState({
        phase: 'error',
        errorMessage: message,
        checkedAt: new Date().toISOString(),
        forceUpdate: this.state.forceUpdate,
      });
      return this.state;
    }
  }

  async downloadUpdate(): Promise<DesktopUpdateState> {
    if (this.downloadPromise) return this.downloadPromise;
    this.downloadPromise = this.runDownload().finally(() => {
      this.downloadPromise = null;
    });
    return this.downloadPromise;
  }

  private async runDownload(): Promise<DesktopUpdateState> {
    const available = this.state.available;
    if (!available) {
      this.setState({
        phase: 'error',
        errorMessage: 'No update is available to download. Check for updates first.',
      });
      return this.state;
    }

    this.downloadAbort?.abort();
    this.downloadAbort = new AbortController();

    const cacheDir = path.join(app.getPath('userData'), 'updates');
    const destinationPath = path.join(cacheDir, available.installerName);

    this.setState({
      phase: 'downloading',
      errorMessage: null,
      downloadPercent: 0,
      downloadedBytes: 0,
      totalBytes: available.installerSizeBytes,
      installerPath: null,
    });

    try {
      const expectedSha256 = available.sha256?.trim() ?? '';
      if (!expectedSha256) {
        this.setState({
          phase: 'error',
          errorMessage: 'Update has no SHA-256; refusing download without integrity metadata.',
          installerPath: null,
        });
        return this.state;
      }

      const result = await downloadInstaller({
        url: available.installerUrl,
        destinationPath,
        expectedSha256,
        expectedSizeBytes: available.installerSizeBytes,
        currentVersion: this.state.currentVersion,
        signal: this.downloadAbort.signal,
        onProgress: ({ percent, downloadedBytes, totalBytes }) => {
          this.setState({
            phase: 'downloading',
            downloadPercent: percent,
            downloadedBytes,
            totalBytes,
          });
        },
      });

      this.setState({
        phase: 'readyToInstall',
        installerPath: result.path,
        downloadPercent: 100,
        downloadedBytes: result.bytes,
        totalBytes: result.bytes,
        errorMessage: null,
      });
      return this.state;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Keep partial + meta on disk for resume; UI can start download again.
        this.setState({
          phase: 'available',
          errorMessage: 'Download paused. Progress is kept — download again to resume.',
          downloadPercent: this.state.downloadPercent,
          downloadedBytes: this.state.downloadedBytes,
          totalBytes: available.installerSizeBytes,
          installerPath: null,
        });
        return this.state;
      }
      const message =
        error instanceof UpdateFetchError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      this.setState({
        phase: 'error',
        errorMessage: message,
        installerPath: null,
      });
      return this.state;
    }
  }

  cancelDownload(): DesktopUpdateState {
    // Forced updates cannot be cancelled mid-download.
    if (this.state.forceUpdate) {
      return this.state;
    }
    this.downloadAbort?.abort();
    this.downloadAbort = null;
    if (this.state.phase === 'downloading') {
      this.setState({
        phase: this.state.available ? 'available' : 'idle',
        downloadPercent: null,
        downloadedBytes: null,
        errorMessage: null,
      });
    }
    return this.state;
  }

  async installUpdate(): Promise<DesktopUpdateInstallResult> {
    const installerPath = this.state.installerPath;
    const available: DesktopUpdateAvailableInfo | null = this.state.available;
    if (!installerPath || !available) {
      return { ok: false, errorMessage: 'Installer is not ready. Download the update first.' };
    }
    if (!fs.existsSync(installerPath)) {
      return { ok: false, errorMessage: 'Installer file is missing. Download again.' };
    }

    if (this.install.channel === 'portable' && available.assetKind !== 'portable') {
      const message =
        'Refusing to install a non-portable update on a portable install (no silent channel migration).';
      this.setState({ phase: 'readyToInstall', errorMessage: message });
      return { ok: false, errorMessage: message };
    }

    const expectedSha256 = available.sha256?.trim() ?? '';
    if (!expectedSha256) {
      const message = 'Update has no SHA-256; refusing install without integrity metadata.';
      this.setState({ phase: 'readyToInstall', errorMessage: message });
      return { ok: false, errorMessage: message };
    }

    this.setState({ phase: 'installing', errorMessage: null });

    try {
      const actualSha256 = await hashFileSha256(installerPath);
      if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
        throw new Error(
          'Installer file failed SHA-256 re-verification before install. Download again.',
        );
      }

      if (this.install.channel === 'portable') {
        await this.applyPortableUpdate(installerPath);
      } else {
        // Setup install: run NSIS UI.
        const child = spawn(installerPath, [], {
          detached: true,
          stdio: 'ignore',
          windowsHide: false,
        });
        child.unref();
        setTimeout(() => {
          app.quit();
        }, 400);
      }

      return { ok: true, errorMessage: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setState({ phase: 'readyToInstall', errorMessage: message });
      return { ok: false, errorMessage: message };
    }
  }

  /**
   * Portable: cannot overwrite the running exe. Write a helper script that waits for
   * this process to exit, replaces the portable executable, relaunches, then self-deletes.
   */
  private async applyPortableUpdate(downloadedPath: string): Promise<void> {
    const targetPath = this.install.executablePath;
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      throw new Error(`Portable install directory is missing: ${targetDir}`);
    }

    try {
      fs.accessSync(targetDir, fs.constants.W_OK);
    } catch {
      throw new Error(
        `Portable directory is not writable: ${targetDir}. Move Cardo to a writable folder or open the release page and replace the file manually.`,
      );
    }

    const updatesDir = path.join(app.getPath('userData'), 'updates');
    fs.mkdirSync(updatesDir, { recursive: true });
    const helperPath = path.join(updatesDir, 'apply-portable-update.cmd');
    const pid = process.pid;

    // cmd.exe-friendly escaped paths
    const esc = (value: string) => value.replace(/"/g, '""');
    const batch = [
      '@echo off',
      'setlocal',
      `set "SOURCE=${esc(downloadedPath)}"`,
      `set "TARGET=${esc(targetPath)}"`,
      `set "PID=${pid}"`,
      ':wait',
      'tasklist /FI "PID eq %PID%" 2>NUL | find "%PID%" >NUL',
      'if not errorlevel 1 (',
      '  timeout /t 1 /nobreak >NUL',
      '  goto wait',
      ')',
      'copy /Y "%SOURCE%" "%TARGET%" >NUL',
      'if errorlevel 1 (',
      '  echo Cardo portable update failed.>>"%TEMP%\\cardo-portable-update.log"',
      '  exit /b 1',
      ')',
      'start "" "%TARGET%"',
      'del "%~f0"',
      '',
    ].join('\r\n');

    fs.writeFileSync(helperPath, batch, 'utf8');

    const child = spawn('cmd.exe', ['/d', '/c', helperPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      cwd: updatesDir,
    });
    child.unref();

    setTimeout(() => {
      app.quit();
    }, 300);
  }

  async openReleasePage(): Promise<void> {
    const url = this.state.available?.releaseUrl;
    if (!url) return;
    await shell.openExternal(url);
  }
}

async function hashFileSha256(filePath: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk: string | Buffer) => {
      hash.update(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
}
