import React, { useState, useRef } from 'react'
import { Search, Loader2, AlertCircle, X } from 'lucide-react'
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
      // clipboard permission denied — user must paste manually
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube URL — e.g. https://www.youtube.com/watch?v=..."
            disabled={loading}
            className={cn(
              'w-full pl-9 pr-20 py-2.5 rounded-lg border bg-background text-sm text-foreground',
              'placeholder:text-muted-foreground/60 transition-colors outline-none',
              'focus:border-primary focus:ring-1 focus:ring-primary/30',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              error
                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                : 'border-border',
            )}
          />

          {url && (
            <button
              type="button"
              onClick={handleClear}
              tabIndex={-1}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePaste}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded bg-secondary/50 hover:bg-secondary"
          >
            Paste
          </button>
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className={cn(
            'px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-sm shadow-primary/20',
          )}
        >
          {loading ? 'Fetching…' : 'Get Info'}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

