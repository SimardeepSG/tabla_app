/**
 * Version history page, reachable from Settings (hidden from the tab bar).
 * Lists the project's commit log newest-first so users can see what
 * changed and confirm their suggestions made it in.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { VERSION_HISTORY } from '../src/models/versionHistory';
import { useTheme, spacing, radius } from '../src/utils/ThemeContext';

export default function VersionHistoryScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: 48 }}
    >
      <Text style={[styles.heading, { color: colors.text }]}>Version History</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Every change to the app, newest first.
      </Text>

      <View
        style={[
          styles.list,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {VERSION_HISTORY.map((entry, i) => (
          <View
            key={i}
            style={[
              styles.row,
              i < VERSION_HISTORY.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.message, { color: colors.text }]}>
                {entry.message}
              </Text>
              <Text style={[styles.date, { color: colors.textTertiary }]}>
                {entry.date}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    marginBottom: spacing.xl,
  },
  list: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    gap: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
});
