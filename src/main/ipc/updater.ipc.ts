import { ipcMain, app } from 'electron'
import { IPC_CHANNELS, AppInfo, FfmpegStatus } from '../../shared/types/ipc.js'
import { UpdaterService } from '../services/updater/updater.service.js'
import { FfmpegService } from '../services/media/ffmpeg.service.js'

export function registerUpdaterAndAppIpc(): void {
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

  ipcMain.handle(IPC_CHANNELS.FFMPEG_GET_STATUS, async (): Promise<FfmpegStatus> => {
    return FfmpegService.getStatus()
  })

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

