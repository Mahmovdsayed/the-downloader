import { ipcMain, app, BrowserWindow } from 'electron'
import { IPC_CHANNELS, AppInfo, FfmpegStatus } from '../../shared/types/ipc.js'
import { FfmpegService } from '../services/ffmpeg/ffmpeg.service.js'
import { FileDialogService } from '../services/files/file-dialog.service.js'
import { UpdaterService } from '../services/updater/updater.service.js'

export function registerAppIpcHandlers(): void {
  // App Info Handlers
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async (): Promise<string> => {
    return app.getVersion()
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_PLATFORM, async (): Promise<string> => {
    return process.platform
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_INFO, async (): Promise<AppInfo> => {
    return {
      version: app.getVersion(),
      name: app.getName(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      isPackaged: app.isPackaged,
    }
  })

  // FFmpeg / FFprobe Service Handler
  ipcMain.handle(IPC_CHANNELS.FFMPEG_GET_STATUS, async (): Promise<FfmpegStatus> => {
    return FfmpegService.getStatus()
  })

  // File Dialog Handler
  ipcMain.handle(
    IPC_CHANNELS.DIALOG_CHOOSE_SAVE_LOCATION,
    async (event, defaultPath?: unknown): Promise<string | null> => {
      // Validate input argument
      const sanitizedDefault = typeof defaultPath === 'string' ? defaultPath : undefined
      const window = BrowserWindow.fromWebContents(event.sender)
      return FileDialogService.chooseSaveLocation(window, sanitizedDefault)
    },
  )

  // Auto-Updater Handlers
  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK_FOR_UPDATES, async (): Promise<void> => {
    return UpdaterService.checkForUpdates()
  })

  ipcMain.handle(IPC_CHANNELS.UPDATER_DOWNLOAD_UPDATE, async (): Promise<void> => {
    return UpdaterService.downloadUpdate()
  })

  ipcMain.on(IPC_CHANNELS.UPDATER_INSTALL_UPDATE, (): void => {
    UpdaterService.installUpdate()
  })
}

