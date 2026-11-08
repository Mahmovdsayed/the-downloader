import React, { useMemo } from 'react'
import { Film, Music, Check } from 'lucide-react'
import { VideoDetails, VideoFormatOption, DownloadMode } from '../../../../../shared/types/ipc.js'
import { Badge } from '../../../components/ui/badge.js'
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
  outputLabel: string
  icon: React.FC<{ className?: string }>
  description: string
}

const TABS: TabDef[] = [
  {
    id: 'video-audio',
    label: 'Video',
    outputLabel: 'MP4',
    icon: Film,
    description: 'Direct MP4 output with combined video & audio streams.',
  },
  {
    id: 'audio-only',
    label: 'Audio',
    outputLabel: 'MP3',
    icon: Music,
    description: 'High-quality MP3 audio track (~190 kbps VBR).',
  },
]

function filterFormats(formats: VideoFormatOption[], mode: DownloadMode): VideoFormatOption[] {
  if (mode === 'audio-only') {
    return formats.filter((f) => f.hasAudio && !f.hasVideo)
  }
  return formats.filter((f) => f.hasVideo)
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
      const key = `${f.qualityLabel || ''}|${f.hasAudio}|${f.fps || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [details.formats, mode])

  const tab = TABS.find((t) => t.id === mode)!

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted border border-border">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = mode === t.id
          return (
            <button
              key={t.id}
              onClick={() => onModeChange(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-colors',
                isActive
                  ? 'bg-background text-foreground border border-border font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded border',
                  isActive
                    ? 'bg-secondary text-foreground border-border'
                    : 'bg-muted text-muted-foreground border-transparent',
                )}
              >
                {t.outputLabel}
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground px-0.5">{tab.description}</p>

      {/* Format list */}
      {filtered.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6 rounded-lg bg-card border border-border">
          No formats available for this mode.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {filtered.map((fmt) => {
            const isSelected = selectedFormatId === fmt.itag
            return (
              <button
                key={fmt.itag}
                onClick={() => onFormatChange(fmt.itag)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-left transition-colors',
                  isSelected
                    ? 'border-foreground bg-accent text-foreground'
                    : 'border-border bg-card hover:bg-muted/50 text-foreground',
                )}
              >
                {/* Selection indicator */}
                <div
                  className={cn(
                    'w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0',
                    isSelected ? 'border-foreground bg-foreground text-background' : 'border-border',
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>

                {/* Format info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      {fmt.qualityLabel || fmt.label || `Format ${fmt.itag}`}
                    </span>
                    {fmt.fps && fmt.fps > 30 && (
                      <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 h-4">
                        {fmt.fps}fps
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                    {fmt.videoCodec && <span className="font-mono">{fmt.videoCodec.split('.')[0]}</span>}
                    {fmt.audioCodec && <span className="font-mono">{fmt.audioCodec.split('.')[0]}</span>}
                    {fmt.bitrate && <span>{formatBitrate(fmt.bitrate)}</span>}
                    {fmt.contentLength && (
                      <span>≈ {formatBytes(fmt.contentLength)}</span>
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
