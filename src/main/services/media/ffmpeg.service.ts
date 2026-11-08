import { spawn, ChildProcess } from 'node:child_process'
import { resolveBinaryPath } from '../../utils/binary-paths.js'

export interface BinaryVersionResult {
  available: boolean
  version?: string
  path?: string
  rawOutput?: string
  error?: string
}

export interface MergeOptions {
  videoPath: string
  audioPath: string
  outputPath: string
  isAudioAac?: boolean
  trim?: {
    startSeconds: number
    endSeconds: number
  }
  onProgress?: (progressPercent: number) => void
  onProcessSpawned?: (process: ChildProcess) => void
}

export function executeBinaryVersionCheck(binaryName: 'ffmpeg' | 'ffprobe'): Promise<BinaryVersionResult> {
  return new Promise((resolve) => {
    const resolved = resolveBinaryPath(binaryName)

    if (!resolved.found || !resolved.path) {
      return resolve({
        available: false,
        error: resolved.error || `Executable for ${binaryName} could not be resolved.`,
      })
    }

    const binaryPath = resolved.path
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const child = spawn(binaryPath, ['-version'], {
      windowsHide: true,
      shell: false,
    })

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
      resolve({
        available: false,
        path: binaryPath,
        error: `${binaryName} process timed out after 5000ms.`,
      })
    }, 5000)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (err) => {
      clearTimeout(timeout)
      if (!timedOut) {
        resolve({
          available: false,
          path: binaryPath,
          error: `Failed to spawn ${binaryName}: ${err.message}`,
        })
      }
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      if (timedOut) return

      if (code === 0) {
        const output = stdout.trim() || stderr.trim()
        const firstLine = output.split('\n')[0]?.trim() || ''
        const versionMatch = firstLine.match(/version\s+([^\s]+)/i)
        const parsedVersion = versionMatch ? versionMatch[1] : firstLine

        resolve({
          available: true,
          version: parsedVersion,
          path: binaryPath,
          rawOutput: firstLine,
        })
      } else {
        resolve({
          available: false,
          path: binaryPath,
          error: `${binaryName} exited with non-zero code ${code}: ${stderr || stdout}`,
        })
      }
    })
  })
}

export class FfmpegService {
  public static async getStatus(): Promise<{
    available: boolean
    ffmpegVersion?: string
    ffprobeVersion?: string
    ffmpegPath?: string
    ffprobePath?: string
    error?: string
  }> {
    try {
      const [ffmpegResult, ffprobeResult] = await Promise.all([
        executeBinaryVersionCheck('ffmpeg'),
        executeBinaryVersionCheck('ffprobe'),
      ])

      const bothAvailable = ffmpegResult.available && ffprobeResult.available

      let combinedError: string | undefined
      if (!bothAvailable) {
        const errors: string[] = []
        if (!ffmpegResult.available) errors.push(`FFmpeg: ${ffmpegResult.error}`)
        if (!ffprobeResult.available) errors.push(`FFprobe: ${ffprobeResult.error}`)
        combinedError = errors.join(' | ')
      }

      return {
        available: bothAvailable,
        ffmpegVersion: ffmpegResult.version,
        ffprobeVersion: ffprobeResult.version,
        ffmpegPath: ffmpegResult.path,
        ffprobePath: ffprobeResult.path,
        error: combinedError,
      }
    } catch (err) {
      return {
        available: false,
        error: `Unexpected error running binary checks: ${(err as Error).message}`,
      }
    }
  }

  /**
   * Merges video and audio streams directly into an MP4 output.
   * - Video is always stream-copied without re-encoding (-c:v copy).
   * - If audio is already AAC, it is stream-copied (-c:a copy).
   * - If audio is Opus or WebM, it is cleanly encoded to standard AAC (-c:a aac -b:a 192k).
   * - Sets -movflags +faststart for instant playback across all desktop players.
   */
  public static mergeStreams(options: MergeOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const resolved = resolveBinaryPath('ffmpeg')
      if (!resolved.found || !resolved.path) {
        return reject(new Error(resolved.error || 'FFmpeg binary not available for merging.'))
      }

      const args: string[] = []

      if (options.trim) {
        const start = Math.max(0, options.trim.startSeconds)
        const end = options.trim.endSeconds
        args.push(
          '-ss', String(start),
          '-to', String(end),
          '-i', options.videoPath,
          '-ss', String(start),
          '-to', String(end),
          '-i', options.audioPath,
          '-c:v', 'copy',
          '-c:a', options.isAudioAac ? 'copy' : 'aac',
          ...(options.isAudioAac ? [] : ['-b:a', '192k']),
          '-avoid_negative_ts', 'make_zero',
          '-movflags', '+faststart',
          '-y', options.outputPath,
        )
      } else {
        args.push(
          '-i', options.videoPath,
          '-i', options.audioPath,
          '-c:v', 'copy',
          '-c:a', options.isAudioAac ? 'copy' : 'aac',
          ...(options.isAudioAac ? [] : ['-b:a', '192k']),
          '-movflags', '+faststart',
          '-y', options.outputPath,
        )
      }

      const child = spawn(resolved.path, args, {
        windowsHide: true,
        shell: false,
      })

      if (options.onProcessSpawned) {
        options.onProcessSpawned(child)
      }

      let stderr = ''
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString()
      })

      child.on('error', (err) => {
        reject(new Error(`Failed to execute FFmpeg merge: ${err.message}`))
      })

      child.on('close', (code, signal) => {
        if (signal === 'SIGKILL' || signal === 'SIGTERM') {
          return reject(new Error('FFmpeg process was cancelled.'))
        }
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg merge exited with code ${code}: ${stderr.slice(-500)}`))
        }
      })
    })
  }

  /**
   * Directly remuxes and/or trims a single input stream into a clean MP4 container.
   */
  public static remuxOrTrimToMp4(options: {
    inputPath: string
    outputPath: string
    isAudioAac?: boolean
    trim?: { startSeconds: number; endSeconds: number }
    onProcessSpawned?: (process: ChildProcess) => void
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const resolved = resolveBinaryPath('ffmpeg')
      if (!resolved.found || !resolved.path) {
        return reject(new Error(resolved.error || 'FFmpeg binary not available for remux.'))
      }

      const args: string[] = []

      if (options.trim) {
        args.push(
          '-ss', String(Math.max(0, options.trim.startSeconds)),
          '-to', String(options.trim.endSeconds),
        )
      }

      args.push(
        '-i', options.inputPath,
        '-c:v', 'copy',
        '-c:a', options.isAudioAac ? 'copy' : 'aac',
        ...(options.isAudioAac ? [] : ['-b:a', '192k']),
        '-avoid_negative_ts', 'make_zero',
        '-movflags', '+faststart',
        '-y', options.outputPath,
      )

      const child = spawn(resolved.path, args, { windowsHide: true, shell: false })
      if (options.onProcessSpawned) options.onProcessSpawned(child)

      let stderr = ''
      child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
      child.on('error', (err) => { reject(new Error(`FFmpeg remux failed: ${err.message}`)) })
      child.on('close', (code, signal) => {
        if (signal === 'SIGKILL' || signal === 'SIGTERM') {
          return reject(new Error('FFmpeg process was cancelled.'))
        }
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg processing exited with code ${code}: ${stderr.slice(-400)}`))
        }
      })
    })
  }

  /**
   * Convert any audio input (M4A/OPUS/WebM-audio) to MP3 using libmp3lame.
   * Quality preset: -q:a 2 (≈190 kbps VBR — high quality, universal compatibility).
   */
  public static convertToMp3(options: {
    inputPath: string
    outputPath: string
    trim?: { startSeconds: number; endSeconds: number }
    onProcessSpawned?: (process: ChildProcess) => void
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const resolved = resolveBinaryPath('ffmpeg')
      if (!resolved.found || !resolved.path) {
        return reject(new Error(resolved.error || 'FFmpeg binary not available for MP3 conversion.'))
      }

      const args: string[] = []

      if (options.trim) {
        args.push(
          '-ss', String(Math.max(0, options.trim.startSeconds)),
          '-to', String(options.trim.endSeconds),
        )
      }

      args.push(
        '-i', options.inputPath,
        '-vn',                     // drop any video stream
        '-c:a', 'libmp3lame',
        '-q:a', '2',               // VBR ~190 kbps — high quality
        '-y', options.outputPath,
      )

      const child = spawn(resolved.path, args, { windowsHide: true, shell: false })
      if (options.onProcessSpawned) options.onProcessSpawned(child)

      let stderr = ''
      child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
      child.on('error', (err) => { reject(new Error(`FFmpeg MP3 conversion failed: ${err.message}`)) })
      child.on('close', (code, signal) => {
        if (signal === 'SIGKILL' || signal === 'SIGTERM') {
          return reject(new Error('FFmpeg MP3 conversion was cancelled.'))
        }
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg MP3 conversion exited with code ${code}: ${stderr.slice(-300)}`))
        }
      })
    })
  }
}

