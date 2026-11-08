import React from 'react'
import { List, Info } from 'lucide-react'

/**
 * DownloadsScreen — History / queue view.
 *
 * Downloads are fire-and-forget via IPC; a full persistent history would
 * require storing job records in a local DB (outside the current scope).
 * This screen is a placeholder that explains the current state and directs
 * users to the Downloader tab for active progress.
 */
export const DownloadsScreen: React.FC = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Download History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Completed and active download records.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-10 shadow-sm flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <List className="w-7 h-7 text-primary/60" />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">No download history yet</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
            Switch to the <strong>Download</strong> tab to paste a YouTube URL and start a
            download. Active progress is tracked there in real time.
          </p>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border/40 text-xs text-muted-foreground max-w-sm text-left">
          <Info className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
          <span>
            Persistent download history (across app restarts) will be added in a future update
            once a local storage backend is integrated.
          </span>
        </div>
      </div>
    </div>
  )
}
