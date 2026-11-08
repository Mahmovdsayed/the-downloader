import { ipcMain, shell } from 'electron'
import fs from 'node:fs'
import { IPC_CHANNELS, DownloadRequest } from '../../shared/types/ipc.js'
import { DownloadService } from '../services/youtube/download.service.js'
import { DownloadJobManager } from '../jobs/download-job.manager.js'

export function registerDownloadIpc(): void {
  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_START, async (_event, rawRequest: unknown): Promise<void> => {
    // Validate request strictly
    if (!rawRequest || typeof rawRequest !== 'object') {
      throw new Error('Invalid download request: Payload must be an object.')
    }

    const req = rawRequest as Partial<DownloadRequest>

    if (!req.jobId || typeof req.jobId !== 'string') {
      throw new Error('Invalid download request: Missing or invalid jobId.')
    }
    if (!req.url || typeof req.url !== 'string') {
      throw new Error('Invalid download request: Missing or invalid URL.')
    }
    if (!req.mode || !['video-audio', 'audio-only'].includes(req.mode)) {
      throw new Error('Invalid download request: Invalid download mode.')
    }
    if (typeof req.formatId !== 'number') {
      throw new Error('Invalid download request: Missing or invalid formatId.')
    }
    if (!req.destinationPath || typeof req.destinationPath !== 'string') {
      throw new Error('Invalid download request: Missing destination path.')
    }

    // Trigger async download (errors handled and emitted via job manager)
    DownloadService.startDownload(req as DownloadRequest).catch((err) => {
      console.error(`Download job ${req.jobId} failed:`, err)
    })
  })

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_CANCEL, async (_event, jobId: unknown): Promise<void> => {
    if (typeof jobId === 'string' && jobId.trim()) {
      DownloadJobManager.cancelJob(jobId.trim())
    }
  })

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_OPEN_FOLDER, async (_event, filePath: unknown): Promise<void> => {
    if (typeof filePath === 'string' && filePath.trim()) {
      const cleanPath = filePath.trim()
      if (fs.existsSync(cleanPath)) {
        shell.showItemInFolder(cleanPath)
      } else {
        const dir = cleanPath.substring(0, cleanPath.lastIndexOf('/'))
        if (fs.existsSync(dir)) {
          shell.openPath(dir)
        }
      }
    }
  })
}

