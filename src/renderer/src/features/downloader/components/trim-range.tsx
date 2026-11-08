import React, { useState } from 'react'
import { Scissors, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '../../../lib/utils.js'

export interface TrimRange {
  startSeconds: number
  endSeconds: number
}

interface TrimRangePickerProps {
  durationSeconds: number
  value: TrimRange | null
  onChange: (range: TrimRange | null) => void
}

function parseTime(input: string): number | null {
  // Accept hh:mm:ss, mm:ss, or bare seconds
  const parts = input.split(':').map((p) => parseFloat(p.trim()))
  if (parts.some(isNaN)) return null

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 1) {
    return parts[0]
  }
  return null
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export const TrimRangePicker: React.FC<TrimRangePickerProps> = ({
  durationSeconds,
  value,
  onChange,
}) => {
  const [enabled, setEnabled] = useState(!!value)
  const [startStr, setStartStr] = useState(value ? formatTime(value.startSeconds) : '0:00')
  const [endStr, setEndStr] = useState(
    value ? formatTime(value.endSeconds) : formatTime(durationSeconds),
  )

  const startSec = parseTime(startStr)
  const endSec = parseTime(endStr)

  const startError =
    startSec === null
      ? 'Invalid time format (use mm:ss or hh:mm:ss)'
      : startSec < 0
        ? 'Start must be ≥ 0'
        : startSec >= durationSeconds
          ? 'Start exceeds video duration'
          : null

  const endError =
    endSec === null
      ? 'Invalid time format (use mm:ss or hh:mm:ss)'
      : endSec > durationSeconds
        ? `End exceeds video duration (${formatTime(durationSeconds)})`
        : startSec !== null && endSec <= startSec
          ? 'End must be greater than start'
          : null

  const isValid = !startError && !endError && startSec !== null && endSec !== null

  const toggleEnabled = () => {
    const next = !enabled
    setEnabled(next)
    if (!next) {
      onChange(null)
    } else if (isValid && startSec !== null && endSec !== null) {
      onChange({ startSeconds: startSec, endSeconds: endSec })
    }
  }

  const handleBlur = () => {
    if (!enabled) return
    if (isValid && startSec !== null && endSec !== null) {
      onChange({ startSeconds: startSec, endSeconds: endSec })
    } else {
      onChange(null)
    }
  }

  return (
    <div className="rounded-lg border border-border/50 bg-secondary/10 overflow-hidden">
      {/* Toggle header */}
      <label className="flex items-center justify-between p-3.5 cursor-pointer select-none hover:bg-secondary/20 transition-colors">
        <div className="flex items-center gap-2.5">
          <Scissors className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-xs font-medium text-foreground">Trim Range</div>
            <div className="text-[11px] text-muted-foreground">
              Clip a specific time range before saving
            </div>
          </div>
        </div>
        <div className="relative">
          <input
            type="checkbox"
            checked={enabled}
            onChange={toggleEnabled}
            className="sr-only"
          />
          <div
            className={cn(
              'w-9 h-5 rounded-full transition-colors',
              enabled ? 'bg-primary' : 'bg-secondary border border-border',
            )}
          >
            <div
              className={cn(
                'w-4 h-4 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform',
                enabled ? 'translate-x-4' : 'translate-x-0.5',
              )}
            />
          </div>
        </div>
      </label>

      {/* Time inputs */}
      {enabled && (
        <div className="px-3.5 pb-3.5 space-y-3">
          <div className="flex gap-3 items-start">
            {/* Start */}
            <div className="flex-1">
              <label className="block text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Start
              </label>
              <input
                type="text"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                onBlur={handleBlur}
                placeholder="0:00"
                className={cn(
                  'w-full px-3 py-2 rounded-lg border bg-background text-xs font-mono text-foreground outline-none transition-colors',
                  'focus:ring-1',
                  startError
                    ? 'border-destructive focus:ring-destructive/20'
                    : 'border-border focus:border-primary focus:ring-primary/20',
                )}
              />
              {startError && (
                <p className="text-[10px] text-destructive mt-1">{startError}</p>
              )}
            </div>

            <div className="pt-6 text-muted-foreground text-xs font-mono">→</div>

            {/* End */}
            <div className="flex-1">
              <label className="block text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                End
              </label>
              <input
                type="text"
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                onBlur={handleBlur}
                placeholder={formatTime(durationSeconds)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border bg-background text-xs font-mono text-foreground outline-none transition-colors',
                  'focus:ring-1',
                  endError
                    ? 'border-destructive focus:ring-destructive/20'
                    : 'border-border focus:border-primary focus:ring-primary/20',
                )}
              />
              {endError && (
                <p className="text-[10px] text-destructive mt-1">{endError}</p>
              )}
            </div>
          </div>

          {/* Keyframe warning */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              Trim uses <code className="font-mono">-c copy</code> for speed. Output boundaries are
              rounded to nearest keyframes — exact frame accuracy requires re-encoding.
            </p>
          </div>

          {isValid && startSec !== null && endSec !== null && (
            <div className="text-[11px] text-muted-foreground">
              Clip duration:{' '}
              <span className="font-mono text-foreground">{formatTime(endSec - startSec)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

