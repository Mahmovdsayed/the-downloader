import React, { useState, useCallback } from 'react'
import { Download, RefreshCw, ArrowLeft } from 'lucide-react'
import { VideoDetails, DownloadMode, DownloadRequest } from '../../../../shared/types/ipc.js'
import { UrlInput } from './components/url-input.js'
import { VideoPreview } from './components/video-preview.js'
import { FormatSelector } from './components/format-selector.js'
import { TrimRangePicker, TrimRange } from './components/trim-range.js'
import { DestinationPicker } from './components/destination-picker.js'
import { DownloadProgressBar } from './components/download-progress.js'
import { useDownload } from './hooks/use-download.js'
import { cn } from '../../lib/utils.js'

type ScreenState = 'idle' | 'fetching' | 'ready' | 'downloading'

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200)
}

function modeToExtension(mode: DownloadMode, container?: string): string {
  if (mode === 'audio-only') return container || 'm4a'
  return container || 'mp4'
}

function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const DownloaderScreen: React.FC = () => {
  const [screenState, setScreenState] = useState<ScreenState>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null)
  const [mode, setMode] = useState<DownloadMode>('video-audio')
  const [selectedFormatId, setSelectedFormatId] = useState<number | null>(null)
  const [trimRange, setTrimRange] = useState<TrimRange | null>(null)
  const [destinationPath, setDestinationPath] = useState<string | null>(() => {
    return localStorage.getItem('download_directory') || null
  })
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const { state: dlState, progress, start, cancel, reset } = useDownload()

  // ── URL fetch ──────────────────────────────────────────────────────────────
  const handleFetch = useCallback(async (url: string) => {
    setScreenState('fetching')
    setFetchError(null)
    setVideoDetails(null)
    setSelectedFormatId(null)
    setTrimRange(null)
    reset()

    try {
      const details = await window.electronAPI.video.getInfo(url)
      setVideoDetails(details)

      // Auto-select the first format for the current mode
      const firstVideo = details.formats.find((f) => f.hasVideo)
      if (firstVideo) setSelectedFormatId(firstVideo.itag)

      setScreenState('ready')
    } catch (err) {
      setFetchError((err as Error).message || 'Failed to fetch video information.')
      setScreenState('idle')
    }
  }, [reset])

  // ── Mode change ────────────────────────────────────────────────────────────
  const handleModeChange = (newMode: DownloadMode) => {
    setMode(newMode)
    setSelectedFormatId(null)
    if (!videoDetails) return

    // Auto-pick first format for new mode
    const filtered = videoDetails.formats.filter((f) => {
      if (newMode === 'audio-only') return f.hasAudio && !f.hasVideo
      if (newMode === 'video-only') return f.hasVideo && !f.hasAudio
      return f.hasVideo
    })
    if (filtered.length > 0) setSelectedFormatId(filtered[0].itag)
  }

  // ── Start download ─────────────────────────────────────────────────────────
  const handleStartDownload = () => {
    if (!videoDetails || selectedFormatId === null || !destinationPath) return

    const selectedFmt = videoDetails.formats.find((f) => f.itag === selectedFormatId)
    const ext = modeToExtension(mode, selectedFmt?.container)
    const safeName = sanitizeFilename(videoDetails.title)

    // Ensure destination ends with correct extension
    let destPath = destinationPath
    if (!destPath.endsWith(`.${ext}`)) {
      // If the path looks like a directory (no extension), append filename
      const hasExt = /\.[a-z0-9]{2,5}$/i.test(destPath)
      if (!hasExt) {
        destPath = `${destPath.replace(/\/$/, '')}/${safeName}.${ext}`
      }
    }

    const jobId = generateJobId()
    setActiveJobId(jobId)

    const request: DownloadRequest = {
      jobId,
      url: videoDetails.url,
      mode,
      formatId: selectedFormatId,
      destinationPath: destPath,
      trim: trimRange
        ? { startSeconds: trimRange.startSeconds, endSeconds: trimRange.endSeconds }
        : undefined,
    }

    setScreenState('downloading')
    start(request)
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    cancel()
  }

  // ── Reveal in Finder ───────────────────────────────────────────────────────
  const handleReveal = () => {
    if (progress?.jobId && destinationPath) {
      window.electronAPI?.downloads?.openFolder(destinationPath).catch(console.error)
    }
  }

  // ── Start over ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    reset()
    setVideoDetails(null)
    setFetchError(null)
    setSelectedFormatId(null)
    setTrimRange(null)
    setActiveJobId(null)
    setMode('video-audio')
    setScreenState('idle')
  }

  // ── Destination path with suggested filename ───────────────────────────────
  const suggestedFilename = videoDetails
    ? sanitizeFilename(videoDetails.title)
    : 'video'

  const selectedFmt = videoDetails?.formats.find((f) => f.itag === selectedFormatId)
  const fileExt = modeToExtension(mode, selectedFmt?.container)

  // Build a full suggested path for the picker
  const suggestedDestPath = (() => {
    const base = localStorage.getItem('download_directory') || ''
    if (!base) return null
    return `${base.replace(/\/$/, '')}/${suggestedFilename}.${fileExt}`
  })()

  const isReadyToDownload =
    screenState === 'ready' && selectedFormatId !== null && destinationPath !== null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Download</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste a YouTube URL to fetch media info and download locally.
          </p>
        </div>

        {screenState !== 'idle' && dlState !== 'downloading' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Start over
          </button>
        )}
      </div>

      {/* URL Input */}
      {screenState !== 'downloading' && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/40">
            <RefreshCw className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Video URL</h3>
          </div>
          <UrlInput
            onFetch={handleFetch}
            loading={screenState === 'fetching'}
            error={fetchError}
          />
        </div>
      )}

      {/* Video info + format picker */}
      {videoDetails && (screenState === 'ready' || screenState === 'downloading') && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5">
          {/* Video preview */}
          <VideoPreview details={videoDetails} />

          {screenState === 'ready' && (
            <>
              {/* Format selector */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
                  Format
                </h4>
                <FormatSelector
                  details={videoDetails}
                  mode={mode}
                  selectedFormatId={selectedFormatId}
                  onModeChange={handleModeChange}
                  onFormatChange={setSelectedFormatId}
                />
              </div>

              {/* Trim range */}
              <TrimRangePicker
                durationSeconds={videoDetails.durationSeconds}
                value={trimRange}
                onChange={setTrimRange}
              />

              {/* Save destination */}
              <DestinationPicker
                destinationPath={destinationPath || suggestedDestPath}
                suggestedName={`${suggestedFilename}.${fileExt}`}
                fileExtension={fileExt}
                onChoose={(path) => {
                  setDestinationPath(path)
                }}
              />

              {/* Download button */}
              <button
                onClick={handleStartDownload}
                disabled={!isReadyToDownload}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'shadow-md shadow-primary/20',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                )}
              >
                <Download className="w-4 h-4" />
                {!destinationPath && !suggestedDestPath
                  ? 'Choose Save Location First'
                  : selectedFormatId === null
                    ? 'Select a Format First'
                    : 'Start Download'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Progress card */}
      {screenState === 'downloading' && progress && destinationPath && (
        <DownloadProgressBar
          progress={progress}
          destinationPath={destinationPath}
          onCancel={handleCancel}
          onReveal={handleReveal}
        />
      )}

      {/* Post-download actions */}
      {(dlState === 'completed' || dlState === 'failed' || dlState === 'cancelled') &&
        progress && destinationPath && (
          <div className="space-y-3">
            <DownloadProgressBar
              progress={progress}
              destinationPath={destinationPath}
              onCancel={handleCancel}
              onReveal={handleReveal}
            />
            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              Download Another Video
            </button>
          </div>
        )}
    </div>
  )
}

