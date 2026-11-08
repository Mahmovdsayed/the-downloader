import React from 'react'
import { ShieldCheck, HardDrive } from 'lucide-react'

interface HeaderProps {
  platform: string
}

export const Header: React.FC<HeaderProps> = ({ platform }) => {
  return (
    <header className="h-12 border-b border-border/50 bg-background/80 backdrop-blur select-none flex items-center justify-between px-4 [app-region:drag]">
      {/* Spacer for macOS traffic lights */}
      <div className={platform === 'darwin' ? 'w-16' : 'w-4'} />

      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground [app-region:no-drag]">
        <HardDrive className="w-3.5 h-3.5 text-primary" />
        <span className="font-semibold text-foreground">Local Video Downloader</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          Local-First Engine
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground [app-region:no-drag]">
        <span className="flex items-center gap-1 text-[11px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Offline Ready
        </span>
      </div>
    </header>
  )
}

