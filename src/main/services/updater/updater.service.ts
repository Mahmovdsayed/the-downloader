import { app, BrowserWindow } from 'electron'
import { IPC_CHANNELS, UpdateStatus } from '../../../shared/types/ipc.js'

export class UpdaterService {
  private static currentStatus: UpdateStatus = { status: 'idle' }
  private static isInitialized = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static autoUpdaterInstance: any = null

  private static getAutoUpdater() {
    if (!this.autoUpdaterInstance && app.isPackaged) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { autoUpdater } = require('electron-updater')
        this.autoUpdaterInstance = autoUpdater
      } catch (err) {
        console.error('Failed to load electron-updater:', err)
      }
    }
    return this.autoUpdaterInstance
  }

  public static initialize(): void {
    if (this.isInitialized) return
    this.isInitialized = true

    // In development mode, autoUpdater is disabled to prevent unpackaged errors
    if (!app.isPackaged) {
      return
    }

    const autoUpdater = this.getAutoUpdater()
    if (!autoUpdater) return

    // Disable automatic download so user has explicit control
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      this.broadcastStatus({
        status: 'checking',
        message: 'Checking for updates on GitHub Releases...',
      })
    })

    autoUpdater.on('update-available', (info: { version: string }) => {
      this.broadcastStatus({
        status: 'available',
        version: info.version,
        message: `Version ${info.version} is available for download.`,
      })
    })

    autoUpdater.on('update-not-available', (info?: { version?: string }) => {
      this.broadcastStatus({
        status: 'not-available',
        version: info?.version,
        message: 'You are using the latest version.',
      })
    })

    autoUpdater.on(
      'download-progress',
      (progressObj: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => {
        this.broadcastStatus({
          status: 'downloading',
          progress: Math.round(progressObj.percent),
          bytesPerSecond: progressObj.bytesPerSecond,
          transferred: progressObj.transferred,
          total: progressObj.total,
          message: `Downloading: ${Math.round(progressObj.percent)}%`,
        })
      },
    )

    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      this.broadcastStatus({
        status: 'downloaded',
        version: info.version,
        message: `Update ${info.version} is ready to install. Restart to apply.`,
      })
    })

    autoUpdater.on('error', (err: Error) => {
      this.broadcastStatus({
        status: 'error',
        error: err.message,
        message: `Update error: ${err.message}`,
      })
    })
  }

  public static async checkForUpdates(): Promise<void> {
    if (!app.isPackaged) {
      this.broadcastStatus({
        status: 'not-available',
        message: 'Auto-updates are safely mocked in development mode. Package and install the app to test live updates.',
      })
      return
    }

    const autoUpdater = this.getAutoUpdater()
    if (!autoUpdater) {
      this.broadcastStatus({
        status: 'error',
        error: 'Auto-updater instance is not available.',
        message: 'Updater unavailable.',
      })
      return
    }

    try {
      this.broadcastStatus({
        status: 'checking',
        message: 'Checking for updates on GitHub Releases...',
      })
      await autoUpdater.checkForUpdates()
    } catch (err) {
      this.broadcastStatus({
        status: 'error',
        error: (err as Error).message,
        message: `Failed to check for updates: ${(err as Error).message}`,
      })
    }
  }

  public static async downloadUpdate(): Promise<void> {
    if (!app.isPackaged) {
      this.broadcastStatus({
        status: 'downloading',
        progress: 50,
        message: 'Mock download in progress (development mode)...',
      })
      setTimeout(() => {
        this.broadcastStatus({
          status: 'downloaded',
          version: 'dev-update',
          message: 'Mock update ready. Restarts are disabled in development mode.',
        })
      }, 1200)
      return
    }

    const autoUpdater = this.getAutoUpdater()
    if (!autoUpdater) return

    try {
      this.broadcastStatus({
        status: 'downloading',
        progress: 0,
        message: 'Starting update download...',
      })
      await autoUpdater.downloadUpdate()
    } catch (err) {
      this.broadcastStatus({
        status: 'error',
        error: (err as Error).message,
        message: `Failed to download update: ${(err as Error).message}`,
      })
    }
  }

  public static installUpdate(): void {
    if (!app.isPackaged) {
      this.broadcastStatus({
        status: 'idle',
        message: 'Cannot install updates in development mode.',
      })
      return
    }

    const autoUpdater = this.getAutoUpdater()
    if (autoUpdater) {
      autoUpdater.quitAndInstall(false, true)
    }
  }

  public static getStatus(): UpdateStatus {
    return this.currentStatus
  }

  private static broadcastStatus(status: UpdateStatus): void {
    this.currentStatus = status
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.UPDATER_STATUS_CHANGED, status)
      }
    }
  }
}
