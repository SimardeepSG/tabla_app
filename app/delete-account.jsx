/**
 * Data deletion page, reachable at /delete-account (hidden from the tab bar).
 * The app has no accounts, so "account deletion" here means erasing every
 * piece of locally stored data. Uses a two-tap confirm instead of
 * Alert.alert because Alert is a silent no-op on web.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllData } from '../src/db/database';
import { useTheme, spacing, radius } from '../src/utils/ThemeContext';
import { Card } from '../src/components/ui/Card';

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  // idle -> confirming -> done (or error)
  const [status, setStatus] = useState('idle');
  const confirmTimer = useRef(null);

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  const handlePress = async () => {
    if (status === 'idle') {
      setStatus('confirming');
      // Give them 5 seconds to confirm, then reset
      confirmTimer.current = setTimeout(() => setStatus('idle'), 5000);
      return;
    }
    if (status === 'confirming') {
      clearTimeout(confirmTimer.current);
      try {
        await clearAllData();
        await AsyncStorage.clear();
        setStatus('done');
      } catch (err) {
        setStatus('error');
      }
    }
  };

  const buttonLabel = {
    idle: 'Erase all my data',
    confirming: 'Tap again to confirm',
    done: 'All data erased',
    error: 'Something went wrong — tap to retry',
  }[status];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: 48 }}
    >
      <Text style={[styles.heading, { color: colors.text }]}>Delete My Data</Text>

      <Card>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          This app has no accounts — there is nothing stored about you on any
          server. Everything lives on this device only:
        </Text>
        <Text style={[styles.listItem, { color: colors.textSecondary }]}>
          •  Custom taals and taal variations
        </Text>
        <Text style={[styles.listItem, { color: colors.textSecondary }]}>
          •  Saved preferences (theme, tanpura scale)
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          The button below permanently erases all of it. This cannot be undone.
          Uninstalling the app removes the same data.
        </Text>
      </Card>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={status === 'done' ? undefined : handlePress}
        style={[
          styles.deleteButton,
          {
            backgroundColor:
              status === 'done' ? colors.success : colors.danger,
            opacity: status === 'done' ? 0.8 : 1,
          },
        ]}
      >
        <Text style={styles.deleteButtonText}>{buttonLabel}</Text>
      </TouchableOpacity>

      {status === 'confirming' && (
        <Text style={[styles.confirmHint, { color: colors.textTertiary }]}>
          This will permanently delete your custom taals and settings.
        </Text>
      )}
      {status === 'done' && (
        <Text style={[styles.confirmHint, { color: colors.textTertiary }]}>
          Restart the app to see it in its fresh state.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.xl,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 24,
    marginTop: 4,
  },
  deleteButton: {
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
