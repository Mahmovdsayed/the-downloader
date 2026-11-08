import React, { useState, useRef } from 'react'
import { Search, Loader2, AlertCircle, X } from 'lucide-react'
import { Input } from '../../../components/ui/input.js'
import { Button } from '../../../components/ui/button.js'
import { cn } from '../../../lib/utils.js'

interface UrlInputProps {
  onFetch: (url: string) => void
  loading: boolean
  error: string | null
}

function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return (
      u.hostname === 'www.youtube.com' ||
      u.hostname === 'youtube.com' ||
      u.hostname === 'youtu.be' ||
      u.hostname === 'm.youtube.com'
    )
  } catch {
    return false
  }
}

export const UrlInput: React.FC<UrlInputProps> = ({ onFetch, loading, error }) => {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isValid = isYouTubeUrl(url)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && !loading) {
      onFetch(url.trim())
    }
  }

  const handleClear = () => {
    setUrl('')
    inputRef.current?.focus()
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setUrl(text.trim())
      }
    } catch {
      // clipboard permission denied
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-foreground" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          <Input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
            disabled={loading}
            className={cn(
              'h-10 pl-9 pr-20 bg-background text-sm text-foreground placeholder:text-muted-foreground',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          />

          {url && (
            <button
              type="button"
              onClick={handleClear}
              tabIndex={-1}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            tabIndex={-1}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Paste
          </Button>
        </div>

        <Button
          type="submit"
          disabled={!isValid || loading}
          className="h-10 px-5 text-sm font-medium"
        >
          {loading ? 'Fetching…' : 'Inspect'}
        </Button>
      </form>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
