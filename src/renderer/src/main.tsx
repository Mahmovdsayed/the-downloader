import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import './styles/globals.css'
import { initTheme } from './lib/theme.js'

// Initialize theme immediately before rendering to prevent flash of wrong theme
initTheme()

const rootElement = document.getElementById('root')

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

