import React, { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, RefreshCw, Cpu, Terminal, Shield, FolderCheck } from 'lucide-react'
import { FfmpegStatus } from '../../../../shared/types/ipc.js'

export const HomeScreen: React.FC = () => {
  const [status, setStatus] = useState<FfmpegStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [platformArch, setPlatformArch] = useState<string>('')

  const fetchFfmpegStatus = async () => {
    setLoading(true)
    try {
      if (window.electronAPI?.ffmpeg) {
        const result = await window.electronAPI.ffmpeg.getStatus()
        setStatus(result)
      }
      if (window.electronAPI?.app) {
        const info = await window.electronAPI.app.getInfo()
        setPlatformArch(`${info.platform}-${info.arch}`)
      }
    } catch (err) {
      setStatus({
        available: false,
        error: (err as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFfmpegStatus()
  }, [])

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Local Video Downloader</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          High-performance, local-first media desktop foundation. All media extraction, multiplexing, and file
          operations run entirely on your local machine with zero external cloud dependencies.
        </p>
      </div>

      {/* FFmpeg Status Card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${status?.available
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm">Media Engine Status (FFmpeg & FFprobe)</h3>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status?.available
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                >
                  {loading ? 'Checking...' : status?.available ? 'Ready & Verified' : 'Action Required'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Runtime resolution and capability verification for bundled binary executables
              </p>
            </div>
          </div>

          <button
            onClick={fetchFfmpegStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Run Check
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* FFmpeg capability */}
          <div className="rounded-lg bg-background/50 border border-border/60 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                FFmpeg Binary
              </span>
              {status?.ffmpegVersion ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  v{status.ffmpegVersion}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unavailable
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground break-all bg-card/60 p-2 rounded border border-border/30">
              {status?.ffmpegPath || 'Binary not resolved'}
            </div>
          </div>

          {/* FFprobe capability */}
          <div className="rounded-lg bg-background/50 border border-border/60 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                FFprobe Binary
              </span>
              {status?.ffprobeVersion ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  v{status.ffprobeVersion}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unavailable
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground break-all bg-card/60 p-2 rounded border border-border/30">
              {status?.ffprobePath || 'Binary not resolved'}
            </div>
          </div>
        </div>

        {status?.error && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Binary Warning:</div>
              <div>{status.error}</div>
              <div className="mt-1 text-[11px] text-amber-300/80">
                Ensure static FFmpeg and FFprobe binaries for <code className="font-mono">{platformArch}</code> are
                placed inside <code className="font-mono">resources/binaries/{platformArch}/</code> with executable permissions.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Architectural Guarantees Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border/60 bg-card/50">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
            <Shield className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-semibold text-foreground mb-1">Strict Context Isolation</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Renderer runs in a sandboxed web context with no direct Node.js or child process access. All privileged tasks
            pass through typed IPC.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/50">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <FolderCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-semibold text-foreground mb-1">Native Dialogs & FS</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Save locations and file operations are managed natively via Electron system dialogs without exposing arbitrary filesystem access.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/50">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-semibold text-foreground mb-1">Self-Contained Binaries</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            FFmpeg and FFprobe executables are resolved dynamically at runtime from Electron&apos;s packaged extra resources.
          </p>
        </div>
      </div>
    </div>
  )
}
