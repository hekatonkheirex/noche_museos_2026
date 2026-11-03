// Tema claro/oscuro. pref = elección guardada de la persona ('light' | 'dark' | null = seguir al sistema).
export const effectiveTheme = (pref, systemDark) => (pref === 'light' || pref === 'dark' ? pref : systemDark ? 'dark' : 'light')
export const otherTheme = (theme) => (theme === 'dark' ? 'light' : 'dark')
export const THEME_KEY = 'ndm-theme'
