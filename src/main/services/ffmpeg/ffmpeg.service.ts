import { spawn } from 'node:child_process'
import { resolveBinaryPath } from './binary-paths.js'

export interface BinaryVersionResult {
  available: boolean
  version?: string
  path?: string
  rawOutput?: string
  error?: string
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

    // Spawning with fixed argument array, shell is false to avoid shell injection
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
        // Parse version line (e.g., "ffmpeg version 7.0.2 ...")
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
}

