/**
 * Privacy policy page, reachable at /privacy (hidden from the tab bar).
 * Required for app-store data-transparency rules. This app is fully
 * offline, so the policy is short: nothing ever leaves the device.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme, spacing, type } from '../src/utils/ThemeContext';
import { Card } from '../src/components/ui/Card';

const SECTIONS = [
  {
    title: 'What this app collects',
    body:
      'Nothing. This app has no accounts, no sign-in, no analytics, no ads, and no tracking of any kind. It never asks for your name, email, location, contacts, microphone, or any other personal information.',
  },
  {
    title: 'What stays on your device',
    body:
      'The taals you create, taal variations, your chosen theme, and your tanpura scale preference are saved in a local database on your device only. They are never uploaded, synced, or shared — the app makes no network requests while you use it.',
  },
  {
    title: 'Audio',
    body:
      'All tabla and tanpura sounds are recordings bundled inside the app (see Settings → Sound credits for their open licenses). The app only plays audio; it never records.',
  },
  {
    title: 'Third parties',
    body:
      'No data is shared with third parties, because no data is collected. There are no third-party SDKs for advertising or analytics in this app.',
  },
  {
    title: 'Deleting your data',
    body:
      'Everything the app stores can be erased from the Delete My Data page (Settings → Delete My Data), or by uninstalling the app. Because nothing is stored off-device, deletion is immediate and complete.',
  },
  {
    title: 'Changes to this policy',
    body:
      'If a future update ever changes how data is handled, this page and the app-store listing will be updated before that version ships.',
  },
];

export default function PrivacyScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: 48 }}
    >
      <Text style={[styles.heading, { color: colors.text }]}>Privacy Policy</Text>
      <Text style={[styles.updated, { color: colors.textTertiary }]}>
        Last updated: July 3, 2026
      </Text>

      {SECTIONS.map((s) => (
        <Card key={s.title}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>{s.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{s.body}</Text>
        </Card>
      ))}

      <View style={{ height: spacing.lg }} />
      <Text style={[type.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
        Summary: your practice data is yours, on your device, full stop.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
});
