/**
 * Settings tab: theme picker (with live mini previews), links to the
 * About pages (version history, privacy, data deletion), and the open
 * license credits for the bundled audio samples.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, themes, spacing, radius, type } from '../utils/ThemeContext';
import { Card } from '../components/ui/Card';

const THEME_NAMES = Object.keys(themes);

const CREDITS = [
  {
    title: 'Tabla strokes',
    body: '"Tabla strokes dataset" by Subodh Deolekar (2020), licensed under CC BY 4.0. Samples unmodified.',
    url: 'https://doi.org/10.5281/zenodo.4327350',
    linkText: 'doi.org/10.5281/zenodo.4327350',
  },
  {
    title: 'Tanpura strings',
    body: 'Tanpura pluck recordings by luckylittleraven on Freesound, released under CC0 1.0 (public domain).',
    url: 'https://freesound.org/people/luckylittleraven/',
    linkText: 'freesound.org/people/luckylittleraven',
  },
];

/** Miniature screen mockup so each theme option previews its real look. */
function ThemeSwatch({ themeColors }) {
  return (
    <View
      style={[
        styles.swatch,
        { backgroundColor: themeColors.background, borderColor: themeColors.border },
      ]}
    >
      <View style={[styles.swatchBar, { backgroundColor: themeColors.surface }]}>
        <View style={[styles.swatchDot, { backgroundColor: themeColors.accent }]} />
      </View>
      <View style={[styles.swatchCard, { backgroundColor: themeColors.surface }]} />
      <View style={[styles.swatchPill, { backgroundColor: themeColors.accent }]} />
    </View>
  );
}

const ABOUT_LINKS = [
  { label: 'Version History', route: '/version-history' },
  { label: 'Privacy Policy', route: '/privacy' },
  { label: 'Delete My Data', route: '/delete-account' },
];

export default function SettingsScreen() {
  const { colors, themeName, setTheme } = useTheme();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: 48 }}
    >
      <Text style={[type.label, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        Theme
      </Text>

      {THEME_NAMES.map((name) => {
        const themeColors = themes[name];
        const isSelected = name === themeName;

        return (
          <TouchableOpacity
            key={name}
            activeOpacity={0.8}
            onPress={() => setTheme(name)}
            style={[
              styles.themeRow,
              {
                backgroundColor: colors.surface,
                borderColor: isSelected ? colors.accent : colors.border,
              },
            ]}
          >
            <ThemeSwatch themeColors={themeColors} />
            <View style={{ flex: 1, marginLeft: spacing.lg }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: isSelected ? colors.accent : colors.text,
                }}
              >
                {name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                {themeColors.isDark ? 'Dark' : 'Light'}
              </Text>
            </View>
            <View
              style={[
                styles.radio,
                { borderColor: isSelected ? colors.accent : colors.border },
              ]}
            >
              {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: spacing.lg }} />

      <Card label="About" style={{ paddingVertical: spacing.sm }}>
        {ABOUT_LINKS.map((item, i) => (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route)}
            style={[
              styles.aboutRow,
              i < ABOUT_LINKS.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
              {item.label}
            </Text>
            <Text style={{ fontSize: 16, color: colors.textTertiary }}>›</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Card label="Sound credits">
        {CREDITS.map((c, i) => (
          <View key={c.title} style={{ marginTop: i === 0 ? 0 : spacing.lg }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
              {c.title}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 19 }}>
              {c.body}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(c.url).catch(() => {})}>
              <Text style={{ fontSize: 13, color: colors.accent, marginTop: 4, fontWeight: '600' }}>
                {c.linkText}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  swatch: {
    width: 64,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
  },
  swatchBar: {
    height: 8,
    borderRadius: 2,
    marginBottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 2,
  },
  swatchDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  swatchCard: {
    height: 14,
    borderRadius: 3,
    marginBottom: 3,
  },
  swatchPill: {
    height: 6,
    width: 26,
    borderRadius: 3,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
