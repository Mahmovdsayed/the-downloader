import React from 'react'
import { Download, Settings, Info, List } from 'lucide-react'
import { cn } from '../../lib/utils.js'

export type TabType = 'downloader' | 'downloads' | 'settings' | 'about'

interface SidebarProps {
  currentTab: TabType
  onSelectTab: (tab: TabType) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'downloader' as TabType, label: 'Download', icon: Download },
    { id: 'downloads' as TabType, label: 'History', icon: List },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
    { id: 'about' as TabType, label: 'About & Updates', icon: Info },
  ]

  return (
    <aside className="w-56 border-r border-border bg-background flex flex-col justify-between p-3 select-none">
      <div className="space-y-4">
        <div className="px-2.5 py-1.5 flex items-center gap-2.5">
          <img
            src="/icon.png"
            alt="Local Video Downloader"
            className="w-7 h-7 rounded-md border border-border object-cover"
          />
          <div>
            <div className="text-xs font-semibold text-foreground tracking-tight">Downloader</div>
            <div className="text-[10px] text-muted-foreground">Local v0.1</div>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left',
                  isActive
                    ? 'bg-secondary text-foreground border border-border font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent',
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="p-3 rounded-lg bg-card border border-border text-[11px] text-muted-foreground">
        <div className="font-medium text-foreground mb-1 text-[11px]">Local Engine</div>
        <div className="text-[10px] leading-relaxed text-muted-foreground">
          Zero remote servers. All media is processed on your machine.
        </div>
      </div>
    </aside>
  )
}
