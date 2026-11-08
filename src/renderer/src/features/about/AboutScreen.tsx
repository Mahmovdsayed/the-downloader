import React, { useState, useEffect } from 'react'
import {
  DownloadCloud,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  ShieldCheck,
} from 'lucide-react'
import { AppInfo, UpdateStatus } from '../../../../shared/types/ipc.js'

export const AboutScreen: React.FC = () => {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle' })
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (window.electronAPI?.app) {
      window.electronAPI.app.getInfo().then(setAppInfo).catch(console.error)
    }

    if (window.electronAPI?.updater) {
      const unsubscribe = window.electronAPI.updater.onStatus((status) => {
        setUpdateStatus(status)
        if (status.status !== 'checking') {
          setChecking(false)
        }
      })
      return () => {
        unsubscribe()
      }
    }
  }, [])

  const handleCheckUpdates = async () => {
    setChecking(true)
    try {
      if (window.electronAPI?.updater) {
        await window.electronAPI.updater.checkForUpdates()
      }
    } catch (err) {
      setUpdateStatus({
        status: 'error',
        error: (err as Error).message,
      })
      setChecking(false)
    }
  }

  const handleDownload = async () => {
    try {
      if (window.electronAPI?.updater) {
        await window.electronAPI.updater.downloadUpdate()
      }
    } catch (err) {
      setUpdateStatus({
        status: 'error',
        error: (err as Error).message,
      })
    }
  }

  const handleInstall = () => {
    if (window.electronAPI?.updater) {
      window.electronAPI.updater.installUpdate()
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">About & Updates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Application release metadata, live update management, and third-party notices.
        </p>
      </div>

      {/* Version & Build Information */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {appInfo?.name || 'Local Video Downloader'}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>Version {appInfo?.version || '0.1.0'}</span>
            <span>•</span>
            <span className="capitalize">{appInfo?.platform} ({appInfo?.arch})</span>
            <span>•</span>
            <span>{appInfo?.isPackaged ? 'Packaged Release' : 'Development Build'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Electron</div>
            <div className="font-mono text-foreground mt-0.5">{appInfo?.electronVersion || 'v33.x'}</div>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Chromium</div>
            <div className="font-mono text-foreground mt-0.5">{appInfo?.chromeVersion || 'v130.x'}</div>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Node.js</div>
            <div className="font-mono text-foreground mt-0.5">{appInfo?.nodeVersion || 'v20.x'}</div>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-muted-foreground uppercase font-medium">Architecture</div>
            <div className="font-mono text-foreground mt-0.5">{appInfo?.arch || 'arm64'}</div>
          </div>
        </div>
      </div>

      {/* Auto-Updater Section */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <DownloadCloud className="w-5 h-5 text-foreground" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Application Updates</h3>
              <p className="text-xs text-muted-foreground">
                Delivered via GitHub Releases using electron-updater.
              </p>
            </div>
          </div>

          {(updateStatus.status === 'idle' ||
            updateStatus.status === 'not-available' ||
            updateStatus.status === 'error') && (
            <button
              onClick={handleCheckUpdates}
              disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-accent text-foreground transition-colors disabled:opacity-50 border border-border"
            >
              <RotateCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              Check for Updates
            </button>
          )}
        </div>

        {/* Status display */}
        <div className="p-4 rounded-lg bg-background border border-border space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Update Status:</span>
            <span className="font-semibold text-foreground capitalize flex items-center gap-1.5">
              {updateStatus.status === 'checking' && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
              {updateStatus.status === 'available' && <CheckCircle className="w-3.5 h-3.5 text-foreground" />}
              {updateStatus.status === 'downloaded' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
              {updateStatus.status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
              {updateStatus.status}
            </span>
          </div>

          {updateStatus.message && (
            <div className="text-xs text-muted-foreground leading-relaxed">
              {updateStatus.message}
            </div>
          )}

          {/* Progress bar when downloading */}
          {updateStatus.status === 'downloading' && (
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-foreground h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${updateStatus.progress || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{updateStatus.progress || 0}% downloaded</span>
                {updateStatus.bytesPerSecond && (
                  <span>{(updateStatus.bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s</span>
                )}
              </div>
            </div>
          )}

          {/* Download button when update is available */}
          {updateStatus.status === 'available' && (
            <div className="pt-1 flex justify-end">
              <button
                onClick={handleDownload}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                Download Update (v{updateStatus.version})
              </button>
            </div>
          )}

          {/* Restart button when downloaded */}
          {updateStatus.status === 'downloaded' && (
            <div className="pt-1 flex justify-end">
              <button
                onClick={handleInstall}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                Restart & Apply Update
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Third Party & License Notices */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Third-Party & Media Processing Notices</h3>
        </div>

        <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>
            This application bundles and relies on <strong>FFmpeg</strong> and <strong>FFprobe</strong> for audio and
            video processing, which are licensed under the GNU Lesser General Public License (LGPL) version 2.1 or later
            (or GPL depending on custom compilation flags).
          </p>
          <p>
            FFmpeg is a trademark of Fabrice Bellard, originator of the FFmpeg project. The executable binaries are
            executed strictly as standalone external processes via standard system pipes with no dynamic linking into the
            proprietary application code.
          </p>
          <div className="pt-1">
            <span className="text-[11px] font-mono text-muted-foreground/80">
              Build source recommendations: Gyan.dev (Windows), Evermeet (macOS), or static builds from ffmpeg.org.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
