import { registerVideoIpc } from './video.ipc.js'
import { registerDownloadIpc } from './download.ipc.js'
import { registerDialogIpc } from './dialog.ipc.js'
import { registerUpdaterAndAppIpc } from './updater.ipc.js'

export function registerAllIpcHandlers(): void {
  registerVideoIpc()
  registerDownloadIpc()
  registerDialogIpc()
  registerUpdaterAndAppIpc()
}
