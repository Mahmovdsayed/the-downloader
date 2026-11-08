import React, { useState } from 'react'
import { Scissors, AlertCircle, Clock } from 'lucide-react'
import { Input } from '../../../components/ui/input.js'
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
      ? 'Use mm:ss or hh:mm:ss'
      : startSec < 0
        ? 'Start must be ≥ 0'
        : startSec >= durationSeconds
          ? 'Exceeds duration'
          : null

  const endError =
    endSec === null
      ? 'Use mm:ss or hh:mm:ss'
      : endSec > durationSeconds
        ? `Exceeds ${formatTime(durationSeconds)}`
        : startSec !== null && endSec <= startSec
          ? 'End must be > start'
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
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Toggle header */}
      <label className="flex items-center justify-between p-3.5 cursor-pointer select-none hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2.5">
          <Scissors className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-xs font-medium text-foreground">Trim Clip</div>
            <div className="text-[11px] text-muted-foreground">
              Optionally extract a segment instead of the full video
            </div>
          </div>
        </div>

        <input
          type="checkbox"
          checked={enabled}
          onChange={toggleEnabled}
          className="w-4 h-4 rounded border-border accent-foreground cursor-pointer"
        />
      </label>

      {/* Time inputs */}
      {enabled && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-border pt-3">
          <div className="flex gap-3 items-start">
            {/* Start */}
            <div className="flex-1">
              <label className="block text-[11px] text-muted-foreground mb-1 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" />
                Start
              </label>
              <Input
                type="text"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                onBlur={handleBlur}
                placeholder="0:00"
                className={cn('h-8 font-mono text-xs', startError && 'border-destructive')}
              />
              {startError && (
                <p className="text-[10px] text-destructive mt-1">{startError}</p>
              )}
            </div>

            <div className="pt-6 text-muted-foreground text-xs font-mono">→</div>

            {/* End */}
            <div className="flex-1">
              <label className="block text-[11px] text-muted-foreground mb-1 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" />
                End
              </label>
              <Input
                type="text"
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                onBlur={handleBlur}
                placeholder={formatTime(durationSeconds)}
                className={cn('h-8 font-mono text-xs', endError && 'border-destructive')}
              />
              {endError && (
                <p className="text-[10px] text-destructive mt-1">{endError}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Trimming uses direct stream copying without re-encoding. Cuts align with the nearest keyframe.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
