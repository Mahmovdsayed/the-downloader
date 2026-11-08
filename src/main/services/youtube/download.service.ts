import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { DownloadRequest } from '../../../shared/types/ipc.js'
import { getYtdlClient } from './ytdl.client.js'
import { VideoInfoService } from './video-info.service.js'
import { FormatSelectionService } from './format-selection.service.js'
import { DownloadJobManager } from '../../jobs/download-job.manager.js'
import { FfmpegService } from '../media/ffmpeg.service.js'
import { TrimService } from '../media/trim.service.js'

export class DownloadService {
  public static async startDownload(request: DownloadRequest): Promise<void> {
    // 1. Validate destination path
    if (!request.destinationPath || typeof request.destinationPath !== 'string') {
      throw new Error('Invalid destination path.')
    }

    const destDir = path.dirname(request.destinationPath)
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    // 2. Validate trim parameters if specified
    if (request.trim) {
      if (
        typeof request.trim.startSeconds !== 'number' ||
        typeof request.trim.endSeconds !== 'number' ||
        request.trim.startSeconds < 0 ||
        request.trim.endSeconds <= request.trim.startSeconds
      ) {
        throw new Error('Invalid trim range: Start time must be >= 0 and end time must be greater than start.')
      }
    }

    // 3. Create isolated temp folder for this job
    const tempDir = path.join(app.getPath('temp'), `ytdl-job-${request.jobId}`)
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    fs.mkdirSync(tempDir, { recursive: true })

    const job = DownloadJobManager.createJob(request, tempDir)

    try {
      const yt = await getYtdlClient()
      const rawInfo = await VideoInfoService.getRawVideoInfo(request.url)
      const allFormats = rawInfo.formats || []

      const targetFormat = allFormats.find((f: { itag: number }) => f.itag === request.formatId)
      if (!targetFormat) {
        throw new Error(`Requested format itag ${request.formatId} is not available for this video.`)
      }

      const isDualStreamNeeded =
        request.mode === 'video-audio' && targetFormat.hasVideo && !targetFormat.hasAudio

      if (isDualStreamNeeded) {
        // Dual stream workflow: Download video, download audio, merge with FFmpeg
        const bestAudio = FormatSelectionService.findBestAudioFormat(allFormats)
        if (!bestAudio) {
          throw new Error('No compatible audio stream found to pair with selected video format.')
        }

        const videoExt = targetFormat.container || 'mp4'
        const audioExt = bestAudio.container || 'm4a'
        const tempVideoFile = path.join(tempDir, `video.${videoExt}`)
        const tempAudioFile = path.join(tempDir, `audio.${audioExt}`)

        // Step A: Download Video Stream
        DownloadJobManager.emitProgress(request.jobId, {
          phase: 'downloading-video',
          message: 'Downloading video stream...',
          percent: 0,
        })

        await this.streamToFile({
          yt,
          info: rawInfo,
          format: targetFormat,
          destination: tempVideoFile,
          jobId: request.jobId,
          phase: 'downloading-video',
        })

        if (job.isCancelled) return

        // Step B: Download Audio Stream
        DownloadJobManager.emitProgress(request.jobId, {
          phase: 'downloading-audio',
          message: 'Downloading audio stream...',
          percent: 0,
        })

        await this.streamToFile({
          yt,
          info: rawInfo,
          format: bestAudio,
          destination: tempAudioFile,
          jobId: request.jobId,
          phase: 'downloading-audio',
        })

        if (job.isCancelled) return

        // Step C: Merge streams with FFmpeg
        // Always use MKV as the intermediate merge container — it is codec-agnostic
        // and accepts VP9/AV1/H264 video + AAC/Opus/MP4A audio without re-encoding.
        const mergePhase = request.trim ? 'trimming' : 'merging'
        DownloadJobManager.emitProgress(request.jobId, {
          phase: mergePhase,
          message: request.trim ? 'Trimming and multiplexing audio/video...' : 'Multiplexing audio and video streams...',
          percent: 90,
        })

        const tempMergedMkv = path.join(tempDir, 'merged.mkv')
        await FfmpegService.mergeStreams({
          videoPath: tempVideoFile,
          audioPath: tempAudioFile,
          outputPath: tempMergedMkv,
          trim: request.trim,
          onProcessSpawned: (proc) => DownloadJobManager.registerProcess(request.jobId, proc),
        })

        if (job.isCancelled) return

        // Step D: Remux MKV → user's chosen format if needed (fast stream copy)
        const destExt = path.extname(request.destinationPath).slice(1).toLowerCase()
        const needsRemux = destExt !== 'mkv' && destExt !== ''

        if (needsRemux) {
          DownloadJobManager.emitProgress(request.jobId, {
            phase: 'saving',
            message: `Remuxing to .${destExt}...`,
            percent: 97,
          })
          await FfmpegService.remuxToTarget({
            inputPath: tempMergedMkv,
            outputPath: request.destinationPath,
            onProcessSpawned: (proc) => DownloadJobManager.registerProcess(request.jobId, proc),
          })
        } else {
          DownloadJobManager.emitProgress(request.jobId, {
            phase: 'saving',
            message: 'Writing completed file to destination...',
            percent: 97,
          })
          await this.moveFile(tempMergedMkv, request.destinationPath)
        }
      } else {
        // Single stream workflow (video-audio combined, video-only, or audio-only)
        const streamExt = targetFormat.container || (request.mode === 'audio-only' ? 'm4a' : 'mp4')
        const tempStreamFile = path.join(tempDir, `stream.${streamExt}`)

        const downloadPhase = request.mode === 'audio-only' ? 'downloading-audio' : 'downloading-video'
        DownloadJobManager.emitProgress(request.jobId, {
          phase: downloadPhase,
          message: `Downloading ${request.mode === 'audio-only' ? 'audio' : 'video'} stream...`,
          percent: 0,
        })

        await this.streamToFile({
          yt,
          info: rawInfo,
          format: targetFormat,
          destination: tempStreamFile,
          jobId: request.jobId,
          phase: downloadPhase,
        })

        if (job.isCancelled) return

        // Apply trimming if requested
        if (request.trim) {
          DownloadJobManager.emitProgress(request.jobId, {
            phase: 'trimming',
            message: 'Trimming media clip with FFmpeg...',
            percent: 95,
          })

          const tempTrimmedFile = path.join(tempDir, `trimmed.${streamExt}`)
          await TrimService.trimFile({
            inputPath: tempStreamFile,
            outputPath: tempTrimmedFile,
            startSeconds: request.trim.startSeconds,
            endSeconds: request.trim.endSeconds,
            onProcessSpawned: (proc) => DownloadJobManager.registerProcess(request.jobId, proc),
          })

          if (job.isCancelled) return

          DownloadJobManager.emitProgress(request.jobId, {
            phase: 'saving',
            message: 'Writing completed file to destination...',
            percent: 99,
          })

          await this.moveFile(tempTrimmedFile, request.destinationPath)
        } else {
          DownloadJobManager.emitProgress(request.jobId, {
            phase: 'saving',
            message: 'Writing completed file to destination...',
            percent: 99,
          })

          await this.moveFile(tempStreamFile, request.destinationPath)
        }
      }

      // Cleanup and complete
      DownloadJobManager.cleanupJob(request.jobId)
      DownloadJobManager.emitProgress(request.jobId, {
        phase: 'completed',
        percent: 100,
        message: 'Download completed successfully.',
      })
    } catch (err) {
      if (job.isCancelled) return
      DownloadJobManager.cleanupJob(request.jobId)
      DownloadJobManager.emitProgress(request.jobId, {
        phase: 'failed',
        error: (err as Error).message || 'An error occurred during download.',
        message: `Failed: ${(err as Error).message}`,
      })
      throw err
    }
  }

  // Helper to pipe ytdl download stream to disk with real progress calculations
  private static streamToFile(params: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yt: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    format: any
    destination: string
    jobId: string
    phase: 'downloading-video' | 'downloading-audio'
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const { yt, info, format, destination, jobId, phase } = params

      let stream: ReturnType<typeof yt.download>
      try {
        stream = yt.download(info, { format })
      } catch (err) {
        return reject(err)
      }

      DownloadJobManager.registerStream(jobId, stream)

      const fileWriteStream = fs.createWriteStream(destination)

      let downloadedBytes = 0
      let totalBytes: number | undefined = format.contentLength
        ? parseInt(format.contentLength, 10)
        : undefined

      let lastReportTime = Date.now()
      let bytesAtLastReport = 0

      stream.on('response', (res: { headers?: Record<string, string> }) => {
        const contentLength = res.headers?.['content-length']
        if (contentLength && !totalBytes) {
          totalBytes = parseInt(contentLength, 10)
        }
      })

      stream.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length

        const now = Date.now()
        const timeDiff = (now - lastReportTime) / 1000

        // Throttle progress emissions to every 250ms to keep IPC and UI performant
        if (timeDiff >= 0.25) {
          const bytesDiff = downloadedBytes - bytesAtLastReport
          const speed = Math.round(bytesDiff / timeDiff)
          let eta: number | undefined

          let percent: number | undefined
          if (totalBytes && totalBytes > 0) {
            percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
            if (speed > 0) {
              eta = Math.max(0, Math.round((totalBytes - downloadedBytes) / speed))
            }
          }

          DownloadJobManager.emitProgress(jobId, {
            phase,
            percent,
            downloadedBytes,
            totalBytes,
            speedBytesPerSecond: speed,
            etaSeconds: eta,
            message: percent !== undefined ? `Downloading: ${percent}%` : `Downloaded ${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB`,
          })

          lastReportTime = now
          bytesAtLastReport = downloadedBytes
        }
      })

      stream.on('error', (err: Error) => {
        fileWriteStream.destroy()
        reject(err)
      })

      fileWriteStream.on('error', (err) => {
        stream.destroy()
        reject(err)
      })

      fileWriteStream.on('finish', () => {
        resolve()
      })

      stream.pipe(fileWriteStream)
    })
  }

  private static async moveFile(source: string, destination: string): Promise<void> {
    try {
      // Try fast rename
      fs.renameSync(source, destination)
    } catch {
      // Fallback across partition/device boundaries: copy and unlink
      fs.copyFileSync(source, destination)
      try {
        fs.unlinkSync(source)
      } catch {
        // Ignore unlink error
      }
    }
  }
}

