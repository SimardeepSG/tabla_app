import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@tabla_app_theme';

export const themes = {
  Saffron: {
    background: '#1a1008',
    surface: '#2a1f10',
    border: '#3d2e18',
    accent: '#d4922a',
    text: '#f0e6d3',
    textSecondary: '#9a8a72',
    danger: '#c0392b',
    buttonBg: '#3d2e18',
  },
  Ocean: {
    background: '#0a1628',
    surface: '#112240',
    border: '#1d3461',
    accent: '#4ecdc4',
    text: '#ccd6f6',
    textSecondary: '#8892b0',
    danger: '#c0392b',
    buttonBg: '#1d3461',
  },
  Light: {
    background: '#f5f0eb',
    surface: '#ffffff',
    border: '#d4cfc8',
    accent: '#8b5e3c',
    text: '#2d2419',
    textSecondary: '#7a7068',
    danger: '#c0392b',
    buttonBg: '#e8e0d6',
  },
  Royal: {
    background: '#1a0a10',
    surface: '#2d1420',
    border: '#4a1e30',
    accent: '#d4a843',
    text: '#f0e0e6',
    textSecondary: '#9a7a85',
    danger: '#c0392b',
    buttonBg: '#4a1e30',
  },
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
