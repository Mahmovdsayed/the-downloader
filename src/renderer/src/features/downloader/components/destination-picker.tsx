import React from 'react'
import { FolderOpen, Folder } from 'lucide-react'
import { SaveDialogOptions } from '../../../../../shared/types/ipc.js'

interface DestinationPickerProps {
  destinationPath: string | null
  suggestedName: string
  fileExtension: string
  onChoose: (path: string) => void
}

export const DestinationPicker: React.FC<DestinationPickerProps> = ({
  destinationPath,
  suggestedName,
  fileExtension,
  onChoose,
}) => {
  const handleBrowse = async () => {
    if (!window.electronAPI?.dialog) return

    const opts: SaveDialogOptions = {
      suggestedFileName: suggestedName,
      filters: [
        {
          name: fileExtension.toUpperCase() + ' File',
          extensions: [fileExtension.replace(/^\./, '')],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
    }

    try {
      const chosen = await window.electronAPI.dialog.chooseSavePath(opts)
      if (chosen) {
        onChoose(chosen)
      }
    } catch (err) {
      console.error('Save dialog error:', err)
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
        <Folder className="w-3.5 h-3.5 text-primary" />
        Save Location
      </label>

      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background border border-border text-xs font-mono text-muted-foreground overflow-hidden">
          <FolderOpen className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
          <span className="truncate">
            {destinationPath || (
              <span className="text-muted-foreground/50 italic">No location selected</span>
            )}
          </span>
        </div>
        <button
          onClick={handleBrowse}
          className="px-4 py-2.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/70 text-foreground transition-colors border border-border/60 whitespace-nowrap"
        >
          Choose…
        </button>
      </div>
    </div>
  )
}

