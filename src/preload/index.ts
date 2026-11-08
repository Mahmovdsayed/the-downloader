import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import {
  IPC_CHANNELS,
  DesktopApi,
  UpdateStatus,
  FfmpegStatus,
  AppInfo,
  VideoDetails,
  DownloadRequest,
  DownloadProgress,
  SaveDialogOptions,
} from '../shared/types/ipc.js'

const desktopApi: DesktopApi = {
  // ── Video info ─────────────────────────────────────────────────────────────
  video: {
    getInfo: (url: string): Promise<VideoDetails> => {
      return ipcRenderer.invoke(IPC_CHANNELS.VIDEO_GET_INFO, url)
    },
  },

  // ── Download management ────────────────────────────────────────────────────
  downloads: {
    start: (request: DownloadRequest): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_START, request)
    },
    cancel: (jobId: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_CANCEL, jobId)
    },
    onProgress: (callback: (progress: DownloadProgress) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, progress: DownloadProgress) => {
        callback(progress)
      }
      ipcRenderer.on(IPC_CHANNELS.DOWNLOADS_ON_PROGRESS, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOADS_ON_PROGRESS, listener)
      }
    },
    openFolder: (filePath: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_OPEN_FOLDER, filePath)
    },
  },

  // ── File dialogs ───────────────────────────────────────────────────────────
  dialog: {
    chooseSavePath: (options: SaveDialogOptions): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.DIALOG_CHOOSE_SAVE_PATH, options)
    },
    chooseSaveLocation: (defaultPath?: string): Promise<string | null> => {
      return ipcRenderer.invoke(IPC_CHANNELS.DIALOG_CHOOSE_SAVE_LOCATION, defaultPath)
    },
  },

  // ── App info ───────────────────────────────────────────────────────────────
  app: {
    getVersion: (): Promise<string> => {
      return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION)
    },
    getPlatform: (): Promise<string> => {
      return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORM)
    },
    getInfo: (): Promise<AppInfo> => {
      return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INFO)
    },
  },

  // ── FFmpeg status ──────────────────────────────────────────────────────────
  ffmpeg: {
    getStatus: (): Promise<FfmpegStatus> => {
      return ipcRenderer.invoke(IPC_CHANNELS.FFMPEG_GET_STATUS)
    },
  },

  // ── Auto-updater ───────────────────────────────────────────────────────────
  updater: {
    checkForUpdates: (): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK_FOR_UPDATES)
    },
    downloadUpdate: (): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD_UPDATE)
    },
    installUpdate: (): void => {
      ipcRenderer.send(IPC_CHANNELS.UPDATER_INSTALL_UPDATE)
    },
    onStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, status: UpdateStatus) => {
        callback(status)
      }
      ipcRenderer.on(IPC_CHANNELS.UPDATER_STATUS_CHANGED, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_STATUS_CHANGED, listener)
      }
    },
  },
}

// Expose safe, explicit desktopApi to the renderer isolated context
contextBridge.exposeInMainWorld('electronAPI', desktopApi)
