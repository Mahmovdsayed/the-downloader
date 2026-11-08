import { DesktopApi } from '../shared/types/ipc'

declare global {
  interface Window {
    electronAPI: DesktopApi
  }
}

