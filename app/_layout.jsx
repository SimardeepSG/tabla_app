/**
 * Root layout: wraps the whole app in its providers (theme, volume,
 * playback state) and defines the bottom tab navigation. Also mounts the
 * mini playback widget overlay and the hidden store-compliance routes.
 */
import React from 'react';
import { View } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VolumeProvider } from '../src/audio/VolumeContext';
import { TablaPlaybackProvider } from '../src/audio/TablaPlaybackContext';
import { TanpuraPlaybackProvider } from '../src/audio/TanpuraPlaybackContext';
import { ThemeProvider, useTheme } from '../src/utils/ThemeContext';
import { TanpuraIcon, TablaIcon, EditorIcon, SettingsIcon } from '../src/components/TabIcons';
import MiniPlaybackWidgets from '../src/components/MiniTablaWidget';

function MiniWidgetOverlay() {
  const pathname = usePathname();
  return (
    <MiniPlaybackWidgets
      hideTabla={pathname === '/tabla'}
      hideTanpura={pathname === '/' || pathname === '/index'}
    />
  );
}

function TabsLayout() {
  const { colors, themeName } = useTheme();
  const isLight = themeName === 'Light';

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.accent,
          headerTitleStyle: { fontWeight: 'bold' },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tanpura',
            tabBarLabel: 'Tanpura',
            tabBarIcon: ({ color, size }) => (
              <TanpuraIcon size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tabla"
          options={{
            title: 'Tabla',
            tabBarLabel: 'Tabla',
            tabBarIcon: ({ color, size }) => (
              <TablaIcon size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="editor"
          options={{
            title: 'Create Taal',
            tabBarLabel: 'Editor',
            tabBarIcon: ({ color, size }) => (
              <EditorIcon size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <SettingsIcon size={size} color={color} />
            ),
          }}
        />
        {/* Store-compliance pages: routable at /privacy, /delete-account,
            /version-history but hidden from the tab bar (href: null) */}
        <Tabs.Screen name="privacy" options={{ title: 'Privacy Policy', href: null }} />
        <Tabs.Screen name="delete-account" options={{ title: 'Delete My Data', href: null }} />
        <Tabs.Screen name="version-history" options={{ title: 'Version History', href: null }} />
      </Tabs>
      <MiniWidgetOverlay />
    </View>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <VolumeProvider>
        <TablaPlaybackProvider>
          <TanpuraPlaybackProvider>
            <TabsLayout />
          </TanpuraPlaybackProvider>
        </TablaPlaybackProvider>
      </VolumeProvider>
    </ThemeProvider>
  );
}
