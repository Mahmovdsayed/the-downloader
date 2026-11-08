export type DownloadMode = 'video-audio' | 'video-only' | 'audio-only'

export interface VideoFormatOption {
  itag: number
  label: string
  container?: string
  qualityLabel?: string
  hasAudio: boolean
  hasVideo: boolean
  videoCodec?: string
  audioCodec?: string
  fps?: number
  bitrate?: number
  contentLength?: string
}

export interface VideoDetails {
  id: string
  url: string
  title: string
  durationSeconds: number
  thumbnailUrl?: string
  author?: string
  formats: VideoFormatOption[]
}

export interface DownloadRequest {
  jobId: string
  url: string
  mode: DownloadMode
  formatId: number
  destinationPath: string
  trim?: {
    startSeconds: number
    endSeconds: number
  }
}

export type DownloadPhase =
  | 'preparing'
  | 'downloading-video'
  | 'downloading-audio'
  | 'merging'
  | 'trimming'
  | 'saving'
  | 'completed'
  | 'cancelled'
  | 'failed'

export interface DownloadProgress {
  jobId: string
  phase: DownloadPhase
  percent?: number
  downloadedBytes?: number
  totalBytes?: number
  speedBytesPerSecond?: number
  etaSeconds?: number
  message?: string
  error?: string
}

export interface DownloadJobRecord {
  id: string
  url: string
  title: string
  thumbnailUrl?: string
  mode: DownloadMode
  formatLabel: string
  destinationPath: string
  status: DownloadPhase
  progressPercent: number
  downloadedBytes: number
  totalBytes: number
  speedBytesPerSecond: number
  error?: string
  startedAt: number
  completedAt?: number
}

export interface UpdateStatus {
  status:
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
  version?: string
  progress?: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
  error?: string
  message?: string
}

export interface FfmpegStatus {
  available: boolean
  ffmpegVersion?: string
  ffprobeVersion?: string
  ffmpegPath?: string
  ffprobePath?: string
  error?: string
}

export interface AppInfo {
  version: string
  name: string
  platform: string
  arch: string
  electronVersion: string
  chromeVersion: string
  nodeVersion: string
  isPackaged: boolean
}

export interface SaveDialogOptions {
  suggestedFileName: string
  filters: Array<{ name: string; extensions: string[] }>
}

export interface DesktopApi {
  video: {
    getInfo(url: string): Promise<VideoDetails>
  }
  downloads: {
    start(request: DownloadRequest): Promise<void>
    cancel(jobId: string): Promise<void>
    onProgress(callback: (progress: DownloadProgress) => void): () => void
    openFolder(filePath: string): Promise<void>
  }
  dialog: {
    chooseSavePath(options: SaveDialogOptions): Promise<string | null>
    chooseSaveLocation(defaultPath?: string): Promise<string | null>
  }
  app: {
    getVersion(): Promise<string>
    getPlatform(): Promise<string>
    getInfo(): Promise<AppInfo>
  }
  ffmpeg: {
    getStatus(): Promise<FfmpegStatus>
  }
  updater: {
    checkForUpdates(): Promise<void>
    downloadUpdate(): Promise<void>
    installUpdate(): void
    onStatus(callback: (status: UpdateStatus) => void): () => void
  }
}

export const IPC_CHANNELS = {
  // Video
  VIDEO_GET_INFO: 'video:get-info',

  // Downloads
  DOWNLOADS_START: 'downloads:start',
  DOWNLOADS_CANCEL: 'downloads:cancel',
  DOWNLOADS_ON_PROGRESS: 'downloads:on-progress',
  DOWNLOADS_OPEN_FOLDER: 'downloads:open-folder',

  // Dialog
  DIALOG_CHOOSE_SAVE_PATH: 'dialog:choose-save-path',
  DIALOG_CHOOSE_SAVE_LOCATION: 'dialog:choose-save-location',

  // App & FFmpeg
  APP_GET_VERSION: 'app:get-version',
  APP_GET_PLATFORM: 'app:get-platform',
  APP_GET_INFO: 'app:get-info',
  FFMPEG_GET_STATUS: 'ffmpeg:get-status',

  // Auto-Updater
  UPDATER_CHECK_FOR_UPDATES: 'updater:check-for-updates',
  UPDATER_DOWNLOAD_UPDATE: 'updater:download-update',
  UPDATER_INSTALL_UPDATE: 'updater:install-update',
  UPDATER_STATUS_CHANGED: 'updater:status-changed',
} as const
