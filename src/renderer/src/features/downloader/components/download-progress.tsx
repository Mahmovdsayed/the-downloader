import React from 'react'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  FolderOpen,
  Zap,
  Clock,
  HardDrive,
} from 'lucide-react'
import { DownloadProgress, DownloadPhase } from '../../../../../shared/types/ipc.js'
import { cn } from '../../../lib/utils.js'

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024)
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  if (bytesPerSecond >= 1024) return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`
  return `${bytesPerSecond} B/s`
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

const PHASE_LABELS: Record<DownloadPhase, string> = {
  preparing: 'Preparing…',
  'downloading-video': 'Downloading video stream…',
  'downloading-audio': 'Downloading audio stream…',
  merging: 'Multiplexing streams with FFmpeg…',
  trimming: 'Trimming with FFmpeg…',
  saving: 'Writing file to disk…',
  completed: 'Download complete',
  cancelled: 'Cancelled',
  failed: 'Download failed',
}

const PHASE_COLORS: Partial<Record<DownloadPhase, string>> = {
  completed: 'text-emerald-400',
  cancelled: 'text-muted-foreground',
  failed: 'text-destructive',
}

interface DownloadProgressBarProps {
  progress: DownloadProgress
  destinationPath: string
  onCancel: () => void
  onReveal: () => void
}

export const DownloadProgressBar: React.FC<DownloadProgressBarProps> = ({
  progress,
  destinationPath,
  onCancel,
  onReveal,
}) => {
  const isDone = progress.phase === 'completed'
  const isFailed = progress.phase === 'failed'
  const isCancelled = progress.phase === 'cancelled'
  const isActive =
    !isDone &&
    !isFailed &&
    !isCancelled &&
    progress.phase !== 'saving' &&
    progress.phase !== 'merging' &&
    progress.phase !== 'trimming'

  const percent = progress.percent ?? 0

  // For non-download phases that don't report percent, show indeterminate
  const isIndeterminate =
    progress.percent === undefined &&
    ['merging', 'trimming', 'saving', 'preparing'].includes(progress.phase)

  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-3 transition-all',
        isDone
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : isFailed
            ? 'border-destructive/30 bg-destructive/5'
            : isCancelled
              ? 'border-border/40 bg-secondary/10'
              : 'border-border bg-card/60',
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : isFailed ? (
            <XCircle className="w-4 h-4 text-destructive" />
          ) : isCancelled ? (
            <XCircle className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          )}

          <span
            className={cn(
              'text-xs font-medium',
              PHASE_COLORS[progress.phase] ?? 'text-foreground',
            )}
          >
            {PHASE_LABELS[progress.phase]}
          </span>
        </div>

        {/* Cancel or Reveal button */}
        {!isDone && !isFailed && !isCancelled ? (
          <button
            onClick={onCancel}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary/50"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        ) : isDone ? (
          <button
            onClick={onReveal}
            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/10"
          >
            <FolderOpen className="w-3 h-3" />
            Reveal
          </button>
        ) : null}
      </div>

      {/* Progress bar */}
      {!isCancelled && !isFailed && (
        <div className="relative w-full h-2 rounded-full bg-secondary overflow-hidden">
          {isIndeterminate ? (
            <div className="absolute inset-0 bg-primary/60 animate-pulse rounded-full" />
          ) : (
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isDone ? 'bg-emerald-500' : 'bg-primary',
              )}
              style={{ width: `${Math.max(2, percent)}%` }}
            />
          )}
        </div>
      )}

      {/* Stats row */}
      {isActive &&
        (progress.downloadedBytes ||
          progress.speedBytesPerSecond ||
          progress.etaSeconds !== undefined) && (
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
            {progress.downloadedBytes !== undefined && (
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatBytes(progress.downloadedBytes)}
                {progress.totalBytes ? ` / ${formatBytes(progress.totalBytes)}` : ''}
              </span>
            )}
            {progress.speedBytesPerSecond !== undefined && progress.speedBytesPerSecond > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {formatSpeed(progress.speedBytesPerSecond)}
              </span>
            )}
            {progress.etaSeconds !== undefined && progress.etaSeconds > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ETA {formatEta(progress.etaSeconds)}
              </span>
            )}
            {progress.percent !== undefined && (
              <span className="ml-auto font-mono font-semibold text-foreground">
                {progress.percent}%
              </span>
            )}
          </div>
        )}

      {/* Error message */}
      {isFailed && progress.error && (
        <p className="text-xs text-destructive leading-relaxed bg-destructive/10 p-2.5 rounded-lg">
          {progress.error}
        </p>
      )}

      {/* Destination path */}
      {isDone && destinationPath && (
        <p className="text-[11px] font-mono text-muted-foreground truncate">
          {destinationPath}
        </p>
      )}
    </div>
  )
}

