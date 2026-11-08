import React, { useMemo } from 'react'
import { Film, Mic, Layers, Check } from 'lucide-react'
import { VideoDetails, VideoFormatOption, DownloadMode } from '../../../../../shared/types/ipc.js'
import { cn } from '../../../lib/utils.js'

function formatBytes(bytes?: string | number): string {
  const n = typeof bytes === 'string' ? parseInt(bytes, 10) : (bytes ?? 0)
  if (!n || isNaN(n)) return ''
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(0)} MB`
  return `${(n / 1024).toFixed(0)} KB`
}

function formatBitrate(bps?: number): string {
  if (!bps) return ''
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} kbps`
  return `${bps} bps`
}

type TabDef = {
  id: DownloadMode
  label: string
  icon: React.FC<{ className?: string }>
  description: string
}

const TABS: TabDef[] = [
  {
    id: 'video-audio',
    label: 'Video + Audio',
    icon: Layers,
    description: 'Best quality — merges separate video and audio streams via FFmpeg',
  },
  {
    id: 'video-only',
    label: 'Video Only',
    icon: Film,
    description: 'Video stream with no audio track',
  },
  {
    id: 'audio-only',
    label: 'Audio Only',
    icon: Mic,
    description: 'Audio-only extraction (MP4A / OPUS / WebM)',
  },
]

function filterFormats(formats: VideoFormatOption[], mode: DownloadMode): VideoFormatOption[] {
  switch (mode) {
    case 'video-audio':
      // Show video formats that are video-only (need FFmpeg merge) OR combined
      return formats.filter((f) => f.hasVideo)
    case 'video-only':
      return formats.filter((f) => f.hasVideo && !f.hasAudio)
    case 'audio-only':
      return formats.filter((f) => f.hasAudio && !f.hasVideo)
    default:
      return formats
  }
}

interface FormatSelectorProps {
  details: VideoDetails
  mode: DownloadMode
  selectedFormatId: number | null
  onModeChange: (mode: DownloadMode) => void
  onFormatChange: (formatId: number) => void
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  details,
  mode,
  selectedFormatId,
  onModeChange,
  onFormatChange,
}) => {
  const filtered = useMemo(() => {
    const seen = new Set<string>()
    return filterFormats(details.formats, mode).filter((f) => {
      // De-duplicate by label+container+hasAudio
      const key = `${f.qualityLabel || ''}|${f.container || ''}|${f.hasAudio}|${f.fps || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [details.formats, mode])

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/40 border border-border/40">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = mode === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onModeChange(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Mode description */}
      <p className="text-[11px] text-muted-foreground px-1">
        {TABS.find((t) => t.id === mode)?.description}
      </p>

      {/* Format list */}
      {filtered.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-8 rounded-lg bg-secondary/20 border border-border/30">
          No formats available for this mode.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {filtered.map((fmt) => {
            const isSelected = selectedFormatId === fmt.itag
            return (
              <button
                key={fmt.itag}
                onClick={() => onFormatChange(fmt.itag)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-left transition-all',
                  isSelected
                    ? 'bg-primary/10 border-primary/40 text-foreground'
                    : 'bg-background border-border/50 hover:border-border hover:bg-secondary/30 text-foreground',
                )}
              >
                {/* Selection indicator */}
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    isSelected ? 'border-primary bg-primary' : 'border-border',
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>

                {/* Format info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      {fmt.qualityLabel || fmt.label || `itag ${fmt.itag}`}
                    </span>
                    {fmt.container && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        .{fmt.container}
                      </span>
                    )}
                    {fmt.fps && fmt.fps > 30 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {fmt.fps}fps
                      </span>
                    )}
                    {!fmt.hasAudio && fmt.hasVideo && mode === 'video-audio' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        needs merge
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                    {fmt.videoCodec && <span>{fmt.videoCodec}</span>}
                    {fmt.audioCodec && <span>{fmt.audioCodec}</span>}
                    {fmt.bitrate && <span>{formatBitrate(fmt.bitrate)}</span>}
                    {fmt.contentLength && (
                      <span className="text-muted-foreground/70">≈ {formatBytes(fmt.contentLength)}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

