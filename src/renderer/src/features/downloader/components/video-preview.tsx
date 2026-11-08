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
    <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-36 h-20 rounded-md overflow-hidden bg-muted border border-border relative">
        {details.thumbnailUrl && !imgFailed ? (
          <img
            src={details.thumbnailUrl}
            alt={details.title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground gap-1">
            <Youtube className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-1 right-1 bg-black/90 text-white text-[10px] font-mono px-1 py-0.5 rounded">
          {formatDuration(details.durationSeconds)}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
            {details.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {details.author && (
            <span className="flex items-center gap-1.5 truncate max-w-[200px]">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{details.author}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(details.durationSeconds)}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/80">
            {details.formats.length} formats
          </span>
        </div>
      </div>
    </div>
  )
}
