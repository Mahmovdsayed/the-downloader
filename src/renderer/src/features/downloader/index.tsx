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
import { addHistoryRecord } from '../../lib/history.js'
import { Card, CardContent } from '../../components/ui/card.js'
import { Button } from '../../components/ui/button.js'

type ScreenState = 'idle' | 'fetching' | 'ready' | 'downloading'

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200)
}

/** Output extension is always mp4 for video, mp3 for audio */
function modeToExtension(mode: DownloadMode): string {
  return mode === 'audio-only' ? 'mp3' : 'mp4'
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

  // Save to download history upon completion
  React.useEffect(() => {
    if (dlState === 'completed' && videoDetails && destinationPath && activeJobId) {
      addHistoryRecord({
        id: activeJobId,
        url: videoDetails.url,
        title: videoDetails.title,
        thumbnailUrl: videoDetails.thumbnailUrl,
        mode,
        formatLabel: mode === 'audio-only' ? 'MP3 Audio' : 'MP4 Video',
        destinationPath,
        status: 'completed',
        progressPercent: 100,
        downloadedBytes: progress?.downloadedBytes || 0,
        totalBytes: progress?.totalBytes || 0,
        speedBytesPerSecond: 0,
        startedAt: Date.now(),
        completedAt: Date.now(),
      })
    }
  }, [dlState, videoDetails, destinationPath, activeJobId, mode, progress])

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

    if (newMode === 'audio-only') {
      // Auto-pick best audio-only format (highest bitrate)
      const audioFormats = videoDetails.formats
        .filter((f) => f.hasAudio && !f.hasVideo)
        .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))
      if (audioFormats.length > 0) setSelectedFormatId(audioFormats[0].itag)
    } else {
      // Auto-pick best video format (highest resolution)
      const videoFormats = videoDetails.formats.filter((f) => f.hasVideo)
      if (videoFormats.length > 0) setSelectedFormatId(videoFormats[0].itag)
    }
  }

  // ── Start download ─────────────────────────────────────────────────────────
  const handleStartDownload = async () => {
    if (!videoDetails || selectedFormatId === null) return

    let destPath = destinationPath
    const ext = modeToExtension(mode)
    const safeName = sanitizeFilename(videoDetails.title)

    // If destination was not selected yet, prompt the native save dialog
    if (!destPath) {
      if (window.electronAPI?.dialog) {
        const chosen = await window.electronAPI.dialog.chooseSavePath({
          suggestedFileName: `${safeName}.${ext}`,
          filters: [
            {
              name: `${ext.toUpperCase()} File`,
              extensions: [ext],
            },
            { name: 'All Files', extensions: ['*'] },
          ],
        })
        if (!chosen) return // User cancelled save dialog
        destPath = chosen
        setDestinationPath(chosen)
      } else {
        return
      }
    }

    // Ensure destination ends with the required extension (.mp4 or .mp3)
    const hasExt = /\.[a-z0-9]{2,5}$/i.test(destPath)
    if (!hasExt) {
      destPath = `${destPath.replace(/\/$/, '')}/${safeName}.${ext}`
    } else {
      // Replace whatever extension the user chose with the required one
      destPath = destPath.replace(/\.[a-z0-9]+$/i, `.${ext}`)
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

  /** Output extension is always mp4 for video, mp3 for audio */
  const fileExt = mode === 'audio-only' ? 'mp3' : 'mp4'

  // Build a full suggested path for the picker
  const suggestedDestPath = (() => {
    const base = localStorage.getItem('download_directory') || ''
    if (!base) return null
    return `${base.replace(/\/$/, '')}/${suggestedFilename}.${fileExt}`
  })()

  const isReadyToDownload =
    screenState === 'ready' && selectedFormatId !== null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Download</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Paste any YouTube URL to inspect formats and download locally.
          </p>
        </div>

        {screenState !== 'idle' && dlState !== 'downloading' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* URL Input */}
      {screenState !== 'downloading' && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border text-xs font-semibold text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
            Video Source
          </div>
          <UrlInput
            onFetch={handleFetch}
            loading={screenState === 'fetching'}
            error={fetchError}
          />
        </Card>
      )}

      {/* Video info + format picker */}
      {videoDetails && (screenState === 'ready' || screenState === 'downloading') && (
        <Card className="p-5 space-y-4">
          {/* Video preview */}
          <VideoPreview details={videoDetails} />

          {screenState === 'ready' && (
            <>
              {/* Format selector */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">
                  Format & Quality
                </div>
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
              <Button
                onClick={handleStartDownload}
                disabled={!isReadyToDownload}
                size="lg"
                className="w-full h-11 text-sm font-semibold gap-2"
              >
                <Download className="w-4 h-4" />
                {selectedFormatId === null
                  ? 'Select a Format First'
                  : destinationPath
                    ? `Download ${fileExt.toUpperCase()}`
                    : `Choose Save Location & Download (${fileExt.toUpperCase()})`}
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Progress card while actively downloading */}
      {screenState === 'downloading' && dlState === 'downloading' && progress && destinationPath && (
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
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full h-10 text-xs font-medium"
            >
              Download Another Video
            </Button>
          </div>
        )}
    </div>
  )
}

