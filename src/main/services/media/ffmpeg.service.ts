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
   * Merges a separate video stream and audio stream into a single output file.
   *
   * Strategy: Always use MKV as the intermediate merge container because MKV
   * is codec-agnostic — it accepts VP9, AV1, H.264, H.265 video paired with
   * AAC, Opus, Vorbis, or MP3 audio without requiring re-encoding.
   *
   * The caller must pass `outputPath` with a `.mkv` extension for the temp file.
   * A separate remux step (MKV → target format) is handled in download.service.ts
   * when the user's chosen extension differs from .mkv.
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
          '-c:a', 'copy',
          '-avoid_negative_ts', 'make_zero',
          '-y', options.outputPath,
        )
      } else {
        args.push(
          '-i', options.videoPath,
          '-i', options.audioPath,
          '-c:v', 'copy',
          '-c:a', 'copy',
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
   * Fast stream-copy remux from one container to another (e.g. MKV → MP4).
   * No re-encoding — only the container wrapper changes.
   */
  public static remuxToTarget(options: {
    inputPath: string
    outputPath: string
    onProcessSpawned?: (process: ChildProcess) => void
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const resolved = resolveBinaryPath('ffmpeg')
      if (!resolved.found || !resolved.path) {
        return reject(new Error(resolved.error || 'FFmpeg binary not available for remux.'))
      }

      const args = [
        '-i', options.inputPath,
        '-c', 'copy',
        '-movflags', '+faststart',
        '-y', options.outputPath,
      ]

      const child = spawn(resolved.path, args, { windowsHide: true, shell: false })
      if (options.onProcessSpawned) options.onProcessSpawned(child)

      let stderr = ''
      child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
      child.on('error', (err) => { reject(new Error(`FFmpeg remux failed: ${err.message}`)) })
      child.on('close', (code, signal) => {
        if (signal === 'SIGKILL' || signal === 'SIGTERM') {
          return reject(new Error('FFmpeg remux was cancelled.'))
        }
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg remux exited with code ${code}: ${stderr.slice(-300)}`))
        }
      })
    })
  }
}

