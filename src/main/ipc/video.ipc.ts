import { ipcMain } from 'electron'
import { IPC_CHANNELS, VideoDetails } from '../../shared/types/ipc.js'
import { VideoInfoService } from '../services/youtube/video-info.service.js'

export function registerVideoIpc(): void {
  ipcMain.handle(IPC_CHANNELS.VIDEO_GET_INFO, async (_event, url: unknown): Promise<VideoDetails> => {
    if (typeof url !== 'string' || !url.trim()) {
      throw new Error('A valid YouTube URL must be provided.')
    }
    return VideoInfoService.getVideoDetails(url.trim())
  })
}

