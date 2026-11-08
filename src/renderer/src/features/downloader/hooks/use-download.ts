import { useState, useEffect, useCallback, useRef } from 'react'
import { DownloadProgress, DownloadRequest } from '../../../../../shared/types/ipc.js'

export type DownloadState = 'idle' | 'downloading' | 'completed' | 'cancelled' | 'failed'

export interface UseDownloadReturn {
  state: DownloadState
  progress: DownloadProgress | null
  start: (request: DownloadRequest) => void
  cancel: () => void
  reset: () => void
}

export function useDownload(): UseDownloadReturn {
  const [state, setState] = useState<DownloadState>('idle')
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const currentJobId = useRef<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Subscribe to progress for the current job
  useEffect(() => {
    if (!window.electronAPI?.downloads) return

    const unsub = window.electronAPI.downloads.onProgress((incoming) => {
      // Only handle progress for the current job
      if (currentJobId.current && incoming.jobId !== currentJobId.current) return

      setProgress(incoming)

      if (incoming.phase === 'completed') {
        setState('completed')
      } else if (incoming.phase === 'failed') {
        setState('failed')
      } else if (incoming.phase === 'cancelled') {
        setState('cancelled')
      }
    })

    unsubscribeRef.current = unsub

    return () => {
      unsub()
    }
  }, [])

  const start = useCallback((request: DownloadRequest) => {
    currentJobId.current = request.jobId
    setState('downloading')
    setProgress({
      jobId: request.jobId,
      phase: 'preparing',
      message: 'Starting download…',
    })

    if (window.electronAPI?.downloads) {
      window.electronAPI.downloads.start(request).catch((err: Error) => {
        setProgress({
          jobId: request.jobId,
          phase: 'failed',
          error: err.message,
          message: `Failed: ${err.message}`,
        })
        setState('failed')
      })
    }
  }, [])

  const cancel = useCallback(() => {
    if (!currentJobId.current) return
    if (window.electronAPI?.downloads) {
      window.electronAPI.downloads.cancel(currentJobId.current).catch(console.error)
    }
    setProgress((prev) =>
      prev ? { ...prev, phase: 'cancelled', message: 'Cancelled by user.' } : null,
    )
    setState('cancelled')
  }, [])

  const reset = useCallback(() => {
    currentJobId.current = null
    setProgress(null)
    setState('idle')
  }, [])

  return { state, progress, start, cancel, reset }
}

