import React from 'react'
import { Download, Settings, Info, Film, List } from 'lucide-react'
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
    <aside className="w-56 border-r border-border/50 bg-card/40 flex flex-col justify-between p-3 select-none">
      <div className="space-y-4">
        <div className="px-3 py-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground tracking-tight">Downloader</div>
            <div className="text-[10px] text-muted-foreground">Local-First v0.1</div>
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
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground',
                  )}
                />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 text-[11px] text-muted-foreground">
        <div className="font-medium text-foreground mb-1">Local Processing</div>
        <div className="text-[10px] leading-relaxed text-muted-foreground">
          Zero remote servers. All media stays strictly on your device.
        </div>
      </div>
    </aside>
  )
}
