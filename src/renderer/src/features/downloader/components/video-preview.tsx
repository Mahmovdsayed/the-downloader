import React, { useState, useEffect } from 'react'
import { Clock, User, Youtube } from 'lucide-react'
import { VideoDetails } from '../../../../../shared/types/ipc.js'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

interface VideoPreviewProps {
  details: VideoDetails
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ details }) => {
  const [imgFailed, setImgFailed] = useState(false)

  // Reset fallback state when a new video is loaded
  useEffect(() => {
    setImgFailed(false)
  }, [details.id, details.thumbnailUrl])

  return (
    <div className="flex gap-4 p-4 rounded-xl border border-border bg-card/60">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden bg-secondary/40 border border-border/40 relative">
        {details.thumbnailUrl && !imgFailed ? (
          <img
            src={details.thumbnailUrl}
            alt={details.title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 text-muted-foreground/60 gap-1">
            <Youtube className="w-8 h-8 text-primary/60" />
            <span className="text-[10px] font-medium text-muted-foreground">Preview</span>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm">
          {formatDuration(details.durationSeconds)}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {details.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mt-2">
          {details.author && (
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary/70" />
              <span className="truncate max-w-[180px]">{details.author}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary/70" />
            {formatDuration(details.durationSeconds)}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/60">
            {details.formats.length} format{details.formats.length !== 1 ? 's' : ''} available
          </span>
        </div>
      </div>
    </div>
  )
}

