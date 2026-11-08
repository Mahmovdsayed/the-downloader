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
import { Button } from '../../../components/ui/button.js'
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
  merging: 'Merging streams with FFmpeg…',
  trimming: 'Trimming with FFmpeg…',
  saving: 'Writing file to disk…',
  completed: 'Download complete',
  cancelled: 'Cancelled',
  failed: 'Download failed',
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
  const isActive = !isDone && !isFailed && !isCancelled

  const percent = progress.percent ?? 0
  const isIndeterminate =
    progress.percent === undefined &&
    ['merging', 'trimming', 'saving', 'preparing'].includes(progress.phase)

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3 transition-colors',
        isDone
          ? 'border-border bg-card'
          : isFailed
            ? 'border-destructive/30 bg-destructive/5'
            : isCancelled
              ? 'border-border bg-muted/20'
              : 'border-border bg-card',
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : isFailed ? (
            <XCircle className="w-4 h-4 text-destructive" />
          ) : isCancelled ? (
            <XCircle className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Loader2 className="w-4 h-4 text-foreground animate-spin" />
          )}

          <span className="text-xs font-medium text-foreground">
            {PHASE_LABELS[progress.phase]}
          </span>
        </div>

        {/* Action */}
        {!isDone && !isFailed && !isCancelled ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
        ) : isDone ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onReveal}
            className="h-7 px-2.5 text-xs"
          >
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
            Show in Folder
          </Button>
        ) : null}
      </div>

      {/* Progress bar */}
      {!isCancelled && !isFailed && (
        <div className="relative w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          {isIndeterminate ? (
            <div className="absolute inset-0 bg-foreground/60 animate-pulse rounded-full" />
          ) : (
            <div
              className="h-full rounded-full bg-foreground transition-all duration-200"
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
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono flex-wrap">
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
              <span className="ml-auto font-semibold text-foreground">
                {progress.percent}%
              </span>
            )}
          </div>
        )}

      {/* Error message */}
      {isFailed && progress.error && (
        <p className="text-xs text-destructive leading-relaxed bg-destructive/10 p-2.5 rounded-md font-mono">
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
