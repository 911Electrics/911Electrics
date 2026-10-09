import type { Theme } from './types'

export const themeLocalStorageKey = 'payload-theme'

export const defaultTheme = 'light'

// Brand site is always light — never follow the OS dark-mode preference.
export const getImplicitPreference = (): Theme | null => 'light'
