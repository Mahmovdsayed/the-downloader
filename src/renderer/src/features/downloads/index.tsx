import React, { useState, useEffect } from 'react'
import {
  List,
  FolderOpen,
  Trash2,
  Film,
  Music,
  ExternalLink,
  Clock,
  HardDrive,
} from 'lucide-react'
import { DownloadJobRecord } from '../../../../shared/types/ipc.js'
import { getHistory, removeHistoryRecord, clearHistory } from '../../lib/history.js'

function formatDate(timestamp: number): string {
  try {
    const d = new Date(timestamp)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Recent'
  }
}

export const DownloadsScreen: React.FC = () => {
  const [records, setRecords] = useState<DownloadJobRecord[]>([])

  useEffect(() => {
    setRecords(getHistory())
  }, [])

  const handleReveal = (filePath: string) => {
    if (window.electronAPI?.downloads) {
      window.electronAPI.downloads.openFolder(filePath).catch(console.error)
    }
  }

  const handleRemove = (id: string) => {
    removeHistoryRecord(id)
    setRecords(getHistory())
  }

  const handleClearAll = () => {
    if (window.confirm('Clear all download history records?')) {
      clearHistory()
      setRecords([])
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Download History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Locally saved media downloads and file locations.
          </p>
        </div>

        {records.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        )}
      </div>

      {/* List or Empty State */}
      {records.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 shadow-sm flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <List className="w-7 h-7 text-primary/60" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">No downloads yet</h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              Media you download will appear here with one-click access to open its containing folder.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map((item) => {
            const isAudio = item.mode === 'audio-only'
            const Icon = isAudio ? Music : Film

            return (
              <div
                key={item.id}
                className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-card/60 hover:bg-card transition-colors shadow-sm"
              >
                {/* Mode Icon / Thumbnail */}
                <div className="w-11 h-11 rounded-lg bg-secondary/40 border border-border/50 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Icon className="w-5 h-5 text-primary/70" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-foreground truncate">
                      {item.title}
                    </h4>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isAudio
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {isAudio ? 'MP3' : 'MP4'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.completedAt || item.startedAt)}
                    </span>
                    <span className="flex items-center gap-1 font-mono truncate max-w-[280px]">
                      <HardDrive className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.destinationPath}</span>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleReveal(item.destinationPath)}
                    title="Show in Finder / Explorer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/70 text-foreground transition-colors border border-border/50"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-primary/70" />
                    <span className="hidden sm:inline">Show</span>
                  </button>

                  <button
                    onClick={() => handleRemove(item.id)}
                    title="Remove from history"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
