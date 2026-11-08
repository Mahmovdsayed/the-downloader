import { spawn, ChildProcess } from 'node:child_process'
import { resolveBinaryPath } from '../../utils/binary-paths.js'

export interface TrimOptions {
  inputPath: string
  outputPath: string
  startSeconds: number
  endSeconds: number
  onProcessSpawned?: (process: ChildProcess) => void
}

export class TrimService {
  public static trimFile(options: TrimOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const resolved = resolveBinaryPath('ffmpeg')
      if (!resolved.found || !resolved.path) {
        return reject(new Error(resolved.error || 'FFmpeg binary not available for trimming.'))
      }

      const start = Math.max(0, options.startSeconds)
      const end = options.endSeconds

      const args = [
        '-ss', String(start),
        '-to', String(end),
        '-i', options.inputPath,
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        '-y', options.outputPath,
      ]

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
        reject(new Error(`Failed to execute FFmpeg trim: ${err.message}`))
      })

      child.on('close', (code, signal) => {
        if (signal === 'SIGKILL' || signal === 'SIGTERM') {
          return reject(new Error('FFmpeg process was cancelled.'))
        }
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg trim exited with code ${code}: ${stderr.slice(-500)}`))
        }
      })
    })
  }
}

