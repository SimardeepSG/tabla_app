import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../../utils/ThemeContext';

/**
 * Large circular play/stop button with a breathing glow ring while playing.
 */
export default function PlayButton({ isPlaying, onPress, label }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 900,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(0);
  }, [isPlaying]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={styles.wrapper}>
      <View style={styles.buttonArea}>
        {isPlaying && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                borderColor: colors.accent,
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          style={[
            styles.button,
            {
              backgroundColor: isPlaying ? colors.danger : colors.accent,
              shadowColor: isPlaying ? colors.danger : colors.accent,
            },
          ]}
        >
          {isPlaying ? (
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Rect x={5} y={5} width={14} height={14} rx={2.5} fill={colors.onAccent} />
            </Svg>
          ) : (
            <Svg width={28} height={28} viewBox="0 0 24 24">
              <Path d="M8 5.5v13c0 .8.9 1.3 1.6.9l10-6.5c.6-.4.6-1.4 0-1.8l-10-6.5c-.7-.4-1.6.1-1.6.9z" fill={colors.onAccent} />
            </Svg>
          )}
        </TouchableOpacity>
      </View>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonArea: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
  },
  button: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
