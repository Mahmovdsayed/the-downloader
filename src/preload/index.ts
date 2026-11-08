import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import {
  IPC_CHANNELS,
  DesktopApi,
  UpdateStatus,
  FfmpegStatus,
  AppInfo,
} from "../shared/types/ipc.js";

const desktopApi: DesktopApi = {
  app: {
    getVersion: (): Promise<string> => {
      return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION);
    },
    getPlatform: (): Promise<string> => {
      return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORM);
    },
    getInfo: (): Promise<AppInfo> => {
      return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INFO);
    },
  },
  ffmpeg: {
    getStatus: (): Promise<FfmpegStatus> => {
      return ipcRenderer.invoke(IPC_CHANNELS.FFMPEG_GET_STATUS);
    },
  },
  dialog: {
    chooseSaveLocation: (defaultPath?: string): Promise<string | null> => {
      return ipcRenderer.invoke(
        IPC_CHANNELS.DIALOG_CHOOSE_SAVE_LOCATION,
        defaultPath,
      );
    },
  },
  updater: {
    checkForUpdates: (): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK_FOR_UPDATES);
    },
    downloadUpdate: (): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD_UPDATE);
    },
    installUpdate: (): void => {
      ipcRenderer.send(IPC_CHANNELS.UPDATER_INSTALL_UPDATE);
    },
    onStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, status: UpdateStatus) => {
        callback(status);
      };
      ipcRenderer.on(IPC_CHANNELS.UPDATER_STATUS_CHANGED, listener);

      // Return cleanup function to remove listener when component unmounts
      return () => {
        ipcRenderer.removeListener(
          IPC_CHANNELS.UPDATER_STATUS_CHANGED,
          listener,
        );
      };
    },
  },
};

// Expose safe, explicit desktopApi to the renderer isolated context
contextBridge.exposeInMainWorld("electronAPI", desktopApi);
