import React, { useState, useEffect } from 'react'
import { Folder, Moon, Sun, Monitor, Check } from 'lucide-react'

export const SettingsScreen: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    return (localStorage.getItem('theme_preference') as 'dark' | 'light' | 'system') || 'dark'
  })
  const [downloadPath, setDownloadPath] = useState<string>(() => {
    return localStorage.getItem('download_directory') || 'Default Downloads Directory'
  })
  const [overwriteFiles, setOverwriteFiles] = useState<boolean>(() => {
    return localStorage.getItem('pref_overwrite') === 'true'
  })
  const [autoOpenFolder, setAutoOpenFolder] = useState<boolean>(() => {
    return localStorage.getItem('pref_auto_open') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('theme_preference', theme)
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
    } else if (theme === 'dark') {
      root.classList.remove('light')
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.remove('light')
      } else {
        root.classList.add('light')
      }
    }
  }, [theme])

  const handleSelectFolder = async () => {
    try {
      if (window.electronAPI?.dialog) {
        const chosen = await window.electronAPI.dialog.chooseSaveLocation(
          downloadPath !== 'Default Downloads Directory' ? downloadPath : undefined,
        )
        if (chosen) {
          setDownloadPath(chosen)
          localStorage.setItem('download_directory', chosen)
        }
      }
    } catch (err) {
      console.error('Failed to select directory:', err)
    }
  }

  const toggleOverwrite = () => {
    const next = !overwriteFiles
    setOverwriteFiles(next)
    localStorage.setItem('pref_overwrite', String(next))
  }

  const toggleAutoOpen = () => {
    const next = !autoOpenFolder
    setAutoOpenFolder(next)
    localStorage.setItem('pref_auto_open', String(next))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure application interface preferences, default directories, and local execution behavior.
        </p>
      </div>

      {/* Theme Preference */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Theme Preference</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select the visual appearance of the application shell.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((item) => {
            const Icon = item.icon
            const isSelected = theme === item.id
            return (
              <button
                key={item.id}
                onClick={() => setTheme(item.id as 'dark' | 'light' | 'system')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border/60 bg-secondary/20 hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5 mb-2" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Default Save Location */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Default Output Location</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Location on disk where processed media files will be saved by default.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono text-muted-foreground truncate flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate">{downloadPath}</span>
          </div>

          <button
            onClick={handleSelectFolder}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Browse Folder
          </button>
        </div>
      </div>

      {/* General Processing Options */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Processing Behavior</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure local file handling and post-processing preferences.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/40 cursor-pointer hover:bg-secondary/40 transition-colors">
            <div>
              <div className="text-xs font-medium text-foreground">Overwrite Existing Files</div>
              <div className="text-[11px] text-muted-foreground">
                Automatically replace target file if a file with the same name already exists.
              </div>
            </div>
            <input
              type="checkbox"
              checked={overwriteFiles}
              onChange={toggleOverwrite}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/40 cursor-pointer hover:bg-secondary/40 transition-colors">
            <div>
              <div className="text-xs font-medium text-foreground">Reveal In Finder / File Explorer</div>
              <div className="text-[11px] text-muted-foreground">
                Highlight the destination directory once media finishing is complete.
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoOpenFolder}
              onChange={toggleAutoOpen}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
            />
          </label>
        </div>
      </div>
    </div>
  )
}

