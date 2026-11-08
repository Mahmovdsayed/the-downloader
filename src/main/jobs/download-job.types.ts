import { Readable } from 'node:stream'
import { ChildProcess } from 'node:child_process'
import { DownloadRequest, DownloadProgress, DownloadPhase } from '../../shared/types/ipc.js'

export interface ManagedJob {
  request: DownloadRequest
  status: DownloadPhase
  progressPercent: number
  downloadedBytes: number
  totalBytes: number
  speedBytesPerSecond: number
  tempDir?: string
  activeStreams: Readable[]
  activeProcesses: ChildProcess[]
  isCancelled: boolean
  error?: string
  startedAt: number
}

export type JobProgressCallback = (progress: DownloadProgress) => void

