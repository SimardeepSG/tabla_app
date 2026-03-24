import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme, themes } from '../utils/ThemeContext';

const THEME_NAMES = Object.keys(themes);

export default function SettingsScreen() {
  const { colors, themeName, setTheme } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: colors.accent,
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        Settings
      </Text>

      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: 16,
        }}
      >
        Theme
      </Text>

      {THEME_NAMES.map((name) => {
        const themeColors = themes[name];
        const isSelected = name === themeName;

        return (
          <TouchableOpacity
            key={name}
            onPress={() => setTheme(name)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 2,
              borderColor: isSelected ? colors.accent : colors.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', marginRight: 16 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: themeColors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginRight: 6,
                }}
              />
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: themeColors.accent,
                  marginRight: 6,
                }}
              />
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: themeColors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: isSelected ? colors.accent : colors.text,
                }}
              >
                {name}
              </Text>
            </View>

            {isSelected && (
              <Text style={{ color: colors.accent, fontSize: 18, fontWeight: 'bold' }}>
                ✓
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
