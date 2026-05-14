import { createContext, useContext, useState, useEffect } from 'react'

const ThemeCtx = createContext()

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Default = dark; only go light if explicitly saved
    return localStorage.getItem('arcadia_theme') !== 'light'
  })

  useEffect(() => {
    localStorage.setItem('arcadia_theme', isDark ? 'dark' : 'light')
    // Drive CSS variable switching via data-theme on <html>
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // Also set on mount so SSR-flash doesn't occur
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      localStorage.getItem('arcadia_theme') === 'light' ? 'light' : 'dark'
    )
  }, [])

  const toggle = () => setIsDark(d => !d)

  return (
    <ThemeCtx.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
