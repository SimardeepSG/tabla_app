import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, radius, type } from '../../utils/ThemeContext';

/**
 * Surface card with optional uppercase section label.
 * elevated: uses the brighter elevated surface + stronger shadow.
 */
export function Card({ label, elevated, style, children }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: colors.border,
          shadowOpacity: colors.isDark ? 0.35 : 0.08,
        },
        elevated && styles.elevated,
        style,
      ]}
    >
      {label ? (
        <Text style={[type.label, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 5,
  },
});
