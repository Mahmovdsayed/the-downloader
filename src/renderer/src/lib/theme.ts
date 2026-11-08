export type Theme = 'dark' | 'light' | 'system'

const THEME_STORAGE_KEY = 'theme_preference'

export function getSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved
    }
  } catch {
    // ignore
  }
  return 'dark'
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore
  }

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}

export function initTheme(): () => void {
  const initialTheme = getSavedTheme()
  applyTheme(initialTheme)

  // Listen for OS system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => {
    if (getSavedTheme() === 'system') {
      applyTheme('system')
    }
  }

  mediaQuery.addEventListener('change', listener)
  return () => mediaQuery.removeEventListener('change', listener)
}

