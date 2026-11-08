import { ipcMain, dialog, BrowserWindow } from 'electron'
import os from 'node:os'
import path from 'node:path'
import { IPC_CHANNELS, SaveDialogOptions } from '../../shared/types/ipc.js'
import { FileDialogService } from '../services/files/file-dialog.service.js'

export function registerDialogIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.DIALOG_CHOOSE_SAVE_PATH,
    async (event, rawOptions: unknown): Promise<string | null> => {
      const window = BrowserWindow.fromWebContents(event.sender)
      const options = (rawOptions || {}) as Partial<SaveDialogOptions>

      const defaultName = typeof options.suggestedFileName === 'string'
        ? options.suggestedFileName
        : 'video.mp4'

      const defaultPath = path.join(os.homedir(), 'Downloads', defaultName)

      const filters = Array.isArray(options.filters)
        ? options.filters
        : [{ name: 'Media Files', extensions: ['mp4', 'm4a', 'webm', 'mkv', 'mp3'] }]

      const result = await dialog.showSaveDialog(window || undefined as unknown as BrowserWindow, {
        title: 'Save Downloaded Media As',
        defaultPath,
        buttonLabel: 'Save',
        filters,
        properties: ['showOverwriteConfirmation'],
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      return result.filePath
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.DIALOG_CHOOSE_SAVE_LOCATION,
    async (event, defaultPath?: unknown): Promise<string | null> => {
      const sanitizedDefault = typeof defaultPath === 'string' ? defaultPath : undefined
      const window = BrowserWindow.fromWebContents(event.sender)
      return FileDialogService.chooseSaveLocation(window, sanitizedDefault)
    },
  )
}

