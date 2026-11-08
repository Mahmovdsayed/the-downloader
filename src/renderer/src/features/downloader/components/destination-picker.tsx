import React from 'react'
import { FolderOpen, Folder } from 'lucide-react'
import { Button } from '../../../components/ui/button.js'
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
          name: `${fileExtension.toUpperCase()} File`,
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
        <Folder className="w-3.5 h-3.5 text-muted-foreground" />
        Destination
      </label>

      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border text-xs font-mono text-muted-foreground overflow-hidden">
          <FolderOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">
            {destinationPath || (
              <span className="text-muted-foreground/60 italic">Default Downloads folder</span>
            )}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBrowse}
          className="h-9 px-3 text-xs"
        >
          Change…
        </Button>
      </div>
    </div>
  )
}
