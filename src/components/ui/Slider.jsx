import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';

/**
 * Touch slider driven by pageX + measured track position, so it works
 * regardless of where the track sits in the layout.
 *
 * value is normalized 0..1; label/valueText are optional adornments.
 */
export default function Slider({ value, onValueChange, label, valueText, height = 8 }) {
  const { colors } = useTheme();
  const trackRef = useRef(null);
  const trackXRef = useRef(0);
  const trackWidthRef = useRef(1);

  const measure = () => {
    if (trackRef.current) {
      trackRef.current.measure((x, y, width, h, pageX) => {
        trackXRef.current = pageX;
        trackWidthRef.current = Math.max(1, width);
      });
    }
  };

  const handleTouch = (e) => {
    const ratio = (e.nativeEvent.pageX - trackXRef.current) / trackWidthRef.current;
    onValueChange(Math.max(0, Math.min(1, ratio)));
  };

  const handleGrant = (e) => {
    measure(); // re-measure so scrolling since layout doesn't skew taps
    handleTouch(e);
  };

  const pct = Math.max(0, Math.min(1, value)) * 100;

  return (
    <View style={styles.row}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        ref={trackRef}
        onLayout={measure}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleGrant}
        onResponderMove={handleTouch}
        style={[styles.track, { backgroundColor: colors.buttonBg, height, borderRadius: height / 2 }]}
        hitSlop={{ top: 12, bottom: 12 }}
      >
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: colors.accent, height, borderRadius: height / 2 },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: `${pct}%`,
              backgroundColor: colors.accent,
              borderColor: colors.background,
              top: height / 2 - 11,
            },
          ]}
        />
      </View>
      {valueText ? (
        <Text style={[styles.valueText, { color: colors.text }]}>{valueText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    width: 68,
  },
  track: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'visible',
    marginHorizontal: 10,
  },
  fill: {
    position: 'absolute',
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'right',
  },
});
