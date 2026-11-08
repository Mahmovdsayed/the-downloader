export interface UpdateStatus {
  status:
    | "idle"
    | "checking"
    | "available"
    | "not-available"
    | "downloading"
    | "downloaded"
    | "error";
  version?: string;
  progress?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  error?: string;
  message?: string;
}

export interface FfmpegStatus {
  available: boolean;
  ffmpegVersion?: string;
  ffprobeVersion?: string;
  ffmpegPath?: string;
  ffprobePath?: string;
  error?: string;
}

export interface AppInfo {
  version: string;
  name: string;
  platform: string;
  arch: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  isPackaged: boolean;
}

export interface DesktopApi {
  app: {
    getVersion(): Promise<string>;
    getPlatform(): Promise<string>;
    getInfo(): Promise<AppInfo>;
  };
  ffmpeg: {
    getStatus(): Promise<FfmpegStatus>;
  };
  dialog: {
    chooseSaveLocation(defaultPath?: string): Promise<string | null>;
  };
  updater: {
    checkForUpdates(): Promise<void>;
    downloadUpdate(): Promise<void>;
    installUpdate(): void;
    onStatus(callback: (status: UpdateStatus) => void): () => void;
  };
}

export const IPC_CHANNELS = {
  APP_GET_VERSION: "app:get-version",
  APP_GET_PLATFORM: "app:get-platform",
  APP_GET_INFO: "app:get-info",
  FFMPEG_GET_STATUS: "ffmpeg:get-status",
  DIALOG_CHOOSE_SAVE_LOCATION: "dialog:choose-save-location",
  UPDATER_CHECK_FOR_UPDATES: "updater:check-for-updates",
  UPDATER_DOWNLOAD_UPDATE: "updater:download-update",
  UPDATER_INSTALL_UPDATE: "updater:install-update",
  UPDATER_STATUS_CHANGED: "updater:status-changed",
} as const;
