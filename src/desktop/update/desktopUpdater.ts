import { app, shell } from 'electron';
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

type StateListener = (state: DesktopUpdateState) => void;

function readCurrentVersion(): string {
  // Packaged builds use artifacts/desktop/package.json version written at package time.
  // Unpackaged dev falls back to app.getVersion() / inject.
  const fromApp = normalizeProductSemver(app.getVersion());
  if (fromApp) return fromApp;
  if (typeof __APP_VERSION__ !== 'undefined') {
    const fromDefine = normalizeProductSemver(__APP_VERSION__);
    if (fromDefine) return fromDefine;
  }
  return '0.0.0';
}

/**
 * Desktop-only GitHub Release updater.
 * Milestone releases only (stable, non-draft). CI does not publish.
 */
export class DesktopUpdater {
  private state: DesktopUpdateState;
  private readonly listeners = new Set<StateListener>();
  private checkPromise: Promise<DesktopUpdateState> | null = null;
  private downloadPromise: Promise<DesktopUpdateState> | null = null;
  private downloadAbort: AbortController | null = null;
  private autoCheckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.state = desktopUpdateStateSchema.parse({
      phase: app.isPackaged ? 'idle' : 'unsupported',
      currentVersion: readCurrentVersion(),
      channel: 'github-stable',
      available: null,
      downloadPercent: null,
      downloadedBytes: null,
      totalBytes: null,
      installerPath: null,
      errorMessage: null,
      checkedAt: null,
      autoCheckEnabled: true,
      isPackaged: app.isPackaged,
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
    if (!this.state.isPackaged) {
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
      });
      const checkedAt = new Date().toISOString();
      if (!available) {
        this.setState({
          phase: 'upToDate',
          available: null,
          installerPath: null,
          checkedAt,
          errorMessage: null,
        });
        return this.state;
      }

      this.setState({
        phase: 'available',
        available,
        installerPath: null,
        checkedAt,
        errorMessage: null,
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
      const result = await downloadInstaller({
        url: available.installerUrl,
        destinationPath,
        expectedSha256: available.sha256,
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
        this.setState({
          phase: 'available',
          errorMessage: 'Download cancelled.',
          downloadPercent: null,
          downloadedBytes: null,
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

    this.setState({ phase: 'installing', errorMessage: null });

    try {
      // NSIS interactive installer (oneClick=false). Detach so Desktop can exit cleanly.
      const child = spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
      child.unref();

      // Give the installer a moment to spawn, then quit so files can be replaced.
      setTimeout(() => {
        app.quit();
      }, 400);

      return { ok: true, errorMessage: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setState({ phase: 'readyToInstall', errorMessage: message });
      return { ok: false, errorMessage: message };
    }
  }

  async openReleasePage(): Promise<void> {
    const url = this.state.available?.releaseUrl;
    if (!url) return;
    await shell.openExternal(url);
  }
}
