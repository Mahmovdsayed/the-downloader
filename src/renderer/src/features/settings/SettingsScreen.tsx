import React, { useState } from 'react'
import { Folder, Moon, Sun, Monitor, Check } from 'lucide-react'
import { Theme, getSavedTheme, applyTheme } from '../../lib/theme.js'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card.js'
import { Button } from '../../components/ui/button.js'
import { cn } from '../../lib/utils.js'

export const SettingsScreen: React.FC = () => {
  const [theme, setThemeState] = useState<Theme>(getSavedTheme)
  const [downloadPath, setDownloadPath] = useState<string>(() => {
    return localStorage.getItem('download_directory') || 'Default Downloads Directory'
  })
  const [overwriteFiles, setOverwriteFiles] = useState<boolean>(() => {
    return localStorage.getItem('pref_overwrite') === 'true'
  })
  const [autoOpenFolder, setAutoOpenFolder] = useState<boolean>(() => {
    return localStorage.getItem('pref_auto_open') === 'true'
  })

  const handleThemeChange = (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
  }

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
        <p className="text-xs text-muted-foreground mt-1">
          Preferences are automatically saved to your local device.
        </p>
      </div>

      {/* Theme Preference */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
          <CardDescription>
            Choose your preferred theme. True black is optimized for OLED displays.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'dark' as Theme, label: 'Dark (Black)', icon: Moon },
              { id: 'light' as Theme, label: 'Light', icon: Sun },
              { id: 'system' as Theme, label: 'System', icon: Monitor },
            ].map((item) => {
              const Icon = item.icon
              const isSelected = theme === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleThemeChange(item.id)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3.5 rounded-lg border text-xs font-medium transition-colors',
                    isSelected
                      ? 'border-foreground bg-accent text-foreground font-semibold'
                      : 'border-border bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="w-4 h-4 mb-2" />
                  <div className="flex items-center gap-1.5">
                    {item.label}
                    {isSelected && <Check className="w-3 h-3 text-foreground" />}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Default Save Location */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-semibold">Default Download Location</CardTitle>
          <CardDescription>
            Where files will be saved if a specific path is not selected in the download dialog.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-md bg-secondary/50 border border-border text-xs font-mono text-muted-foreground truncate flex items-center gap-2">
              <Folder className="w-4 h-4 text-foreground/70 flex-shrink-0" />
              <span className="truncate">{downloadPath}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectFolder}
            >
              Browse
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* General Processing Options */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-semibold">File Behavior</CardTitle>
          <CardDescription>Configure local post-processing actions.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-2">
          <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer hover:bg-muted/40 transition-colors">
            <div>
              <div className="text-xs font-medium text-foreground">Overwrite Existing Files</div>
              <div className="text-[11px] text-muted-foreground">
                Replace destination file if a file with the same name already exists.
              </div>
            </div>
            <input
              type="checkbox"
              checked={overwriteFiles}
              onChange={toggleOverwrite}
              className="w-4 h-4 rounded border-border accent-foreground cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer hover:bg-muted/40 transition-colors">
            <div>
              <div className="text-xs font-medium text-foreground">Reveal in Finder / Explorer</div>
              <div className="text-[11px] text-muted-foreground">
                Automatically reveal the destination directory once media finishes saving.
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoOpenFolder}
              onChange={toggleAutoOpen}
              className="w-4 h-4 rounded border-border accent-foreground cursor-pointer"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  )
}
