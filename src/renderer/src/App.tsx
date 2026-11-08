import React, { useState, useEffect } from 'react'
import { Header } from './components/layout/Header.js'
import { Sidebar, TabType } from './components/layout/Sidebar.js'
import { HomeScreen } from './features/home/HomeScreen.js'
import { SettingsScreen } from './features/settings/SettingsScreen.js'
import { AboutScreen } from './features/about/AboutScreen.js'

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('home')
  const [platform, setPlatform] = useState<string>('darwin')

  useEffect(() => {
    // Detect host platform for native chrome/traffic-light spacing
    if (window.electronAPI?.app) {
      window.electronAPI.app.getPlatform().then((p) => {
        setPlatform(p)
      }).catch(console.error)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Titlebar / Header */}
      <Header platform={platform} />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* View Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background/50">
          {currentTab === 'home' && <HomeScreen />}
          {currentTab === 'settings' && <SettingsScreen />}
          {currentTab === 'about' && <AboutScreen />}
        </main>
      </div>
    </div>
  )
}

export default App

