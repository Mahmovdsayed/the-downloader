import { DownloadJobRecord } from '../../../shared/types/ipc.js'

const HISTORY_STORAGE_KEY = 'video_downloader_history'

export function getHistory(): DownloadJobRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addHistoryRecord(record: DownloadJobRecord): void {
  try {
    const current = getHistory()
    // Prepend new record, cap at 50 most recent records
    const updated = [record, ...current.filter((r) => r.id !== record.id)].slice(0, 50)
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to save download history:', err)
  }
}

export function removeHistoryRecord(id: string): void {
  try {
    const current = getHistory()
    const updated = current.filter((r) => r.id !== id)
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to remove download history record:', err)
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear download history:', err)
  }
}

