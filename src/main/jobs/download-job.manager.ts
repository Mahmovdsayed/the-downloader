import { app, BrowserWindow } from 'electron'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import { ChildProcess } from 'node:child_process'
import { DownloadRequest, DownloadProgress, DownloadPhase, IPC_CHANNELS } from '../../shared/types/ipc.js'
import { ManagedJob } from './download-job.types.js'

export class DownloadJobManager {
  private static jobs = new Map<string, ManagedJob>()

  public static createJob(request: DownloadRequest, tempDir: string): ManagedJob {
    const job: ManagedJob = {
      request,
      status: 'preparing',
      progressPercent: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speedBytesPerSecond: 0,
      tempDir,
      activeStreams: [],
      activeProcesses: [],
      isCancelled: false,
      startedAt: Date.now(),
    }
    this.jobs.set(request.jobId, job)
    this.emitProgress(request.jobId, {
      phase: 'preparing',
      message: 'Initializing local download environment...',
    })
    return job
  }

  public static getJob(jobId: string): ManagedJob | undefined {
    return this.jobs.get(jobId)
  }

  public static registerStream(jobId: string, stream: Readable): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.activeStreams.push(stream)
    }
  }

  public static registerProcess(jobId: string, process: ChildProcess): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.activeProcesses.push(process)
    }
  }

  public static emitProgress(
    jobId: string,
    update: {
      phase: DownloadPhase
      percent?: number
      downloadedBytes?: number
      totalBytes?: number
      speedBytesPerSecond?: number
      etaSeconds?: number
      message?: string
      error?: string
    },
  ): void {
    const job = this.jobs.get(jobId)
    if (!job || job.isCancelled) return

    job.status = update.phase
    if (update.percent !== undefined) job.progressPercent = update.percent
    if (update.downloadedBytes !== undefined) job.downloadedBytes = update.downloadedBytes
    if (update.totalBytes !== undefined) job.totalBytes = update.totalBytes
    if (update.speedBytesPerSecond !== undefined) job.speedBytesPerSecond = update.speedBytesPerSecond
    if (update.error) job.error = update.error

    const payload: DownloadProgress = {
      jobId,
      phase: update.phase,
      percent: update.percent,
      downloadedBytes: update.downloadedBytes,
      totalBytes: update.totalBytes,
      speedBytesPerSecond: update.speedBytesPerSecond,
      etaSeconds: update.etaSeconds,
      message: update.message,
      error: update.error,
    }

    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.DOWNLOADS_ON_PROGRESS, payload)
      }
    }
  }

  public static cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId)
    if (!job || job.isCancelled) return

    job.isCancelled = true
    job.status = 'cancelled'

    // 1. Destroy all active download streams
    for (const stream of job.activeStreams) {
      try {
        stream.destroy()
      } catch (err) {
        console.error(`Error destroying stream for job ${jobId}:`, err)
      }
    }
    job.activeStreams = []

    // 2. Terminate all active FFmpeg/child processes
    for (const proc of job.activeProcesses) {
      try {
        proc.kill('SIGKILL')
      } catch (err) {
        console.error(`Error killing process for job ${jobId}:`, err)
      }
    }
    job.activeProcesses = []

    // 3. Clean up temporary files
    if (job.tempDir && fs.existsSync(job.tempDir)) {
      try {
        fs.rmSync(job.tempDir, { recursive: true, force: true })
      } catch (err) {
        console.error(`Error cleaning temp dir for job ${jobId}:`, err)
      }
    }

    // 4. Notify UI
    this.emitProgress(jobId, {
      phase: 'cancelled',
      message: 'Download was cancelled by user.',
    })
  }

  public static cleanupJob(jobId: string): void {
    const job = this.jobs.get(jobId)
    if (!job) return

    if (job.tempDir && fs.existsSync(job.tempDir)) {
      try {
        fs.rmSync(job.tempDir, { recursive: true, force: true })
      } catch (err) {
        console.error(`Error cleaning temp dir for job ${jobId}:`, err)
      }
    }

    // Retain completed/cancelled record for history
    job.activeStreams = []
    job.activeProcesses = []
  }

  public static cancelAll(): void {
    for (const jobId of this.jobs.keys()) {
      this.cancelJob(jobId)
    }
  }
}

// Hook application lifecycle to ensure no orphaned processes or temp files on app shutdown
app.on('before-quit', () => {
  DownloadJobManager.cancelAll()
})

