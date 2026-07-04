/**
 * App-wide design system: four color themes (persisted with AsyncStorage)
 * plus shared spacing / radius / typography tokens. Every screen pulls its
 * colors from useTheme() so switching themes restyles the whole app.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@tabla_app_theme';

export const themes = {
  Saffron: {
    background: '#171009',
    surface: '#241a0e',
    surfaceElevated: '#2e2213',
    border: '#3d2e18',
    accent: '#e09b2d',
    accentSoft: 'rgba(224, 155, 45, 0.14)',
    onAccent: '#1a1008',
    text: '#f3e9d6',
    textSecondary: '#a4917a',
    textTertiary: '#6f614e',
    danger: '#e05543',
    success: '#63b57f',
    buttonBg: '#3d2e18',
    isDark: true,
  },
  Ocean: {
    background: '#0a1628',
    surface: '#112240',
    surfaceElevated: '#16294d',
    border: '#1d3461',
    accent: '#4ecdc4',
    accentSoft: 'rgba(78, 205, 196, 0.14)',
    onAccent: '#06121f',
    text: '#dbe4f6',
    textSecondary: '#8892b0',
    textTertiary: '#5a6482',
    danger: '#e05543',
    success: '#63b57f',
    buttonBg: '#1d3461',
    isDark: true,
  },
  Light: {
    background: '#f7f3ee',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    border: '#e2dbd2',
    accent: '#9a6435',
    accentSoft: 'rgba(154, 100, 53, 0.10)',
    onAccent: '#ffffff',
    text: '#2d2419',
    textSecondary: '#7a7068',
    textTertiary: '#a89e94',
    danger: '#c0392b',
    success: '#2e7d4f',
    buttonBg: '#ede5da',
    isDark: false,
  },
  Royal: {
    background: '#160812',
    surface: '#26101e',
    surfaceElevated: '#311529',
    border: '#4a1e30',
    accent: '#d4a843',
    accentSoft: 'rgba(212, 168, 67, 0.14)',
    onAccent: '#1a0a10',
    text: '#f0e0e6',
    textSecondary: '#9a7a85',
    textTertiary: '#6b5560',
    danger: '#e05543',
    success: '#63b57f',
    buttonBg: '#4a1e30',
    isDark: true,
  },
};

/** Shared non-color design tokens */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };
export const type = {
  display: { fontSize: 30, fontWeight: '800', letterSpacing: 0.3 },
  title: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  caption: { fontSize: 12, fontWeight: '400' },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState('Saffron');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored && themes[stored]) {
        setThemeName(stored);
      }
    }).catch(() => {});
  }, []);

  const setTheme = (name) => {
    if (themes[name]) {
      setThemeName(name);
      AsyncStorage.setItem(THEME_STORAGE_KEY, name).catch(() => {});
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        colors: themes[themeName],
        themeName,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
