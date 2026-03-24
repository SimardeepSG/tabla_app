import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTablaPlayback } from '../audio/TablaPlaybackContext';
import { useTanpuraPlayback } from '../audio/TanpuraPlaybackContext';
import { useTheme } from '../utils/ThemeContext';

const SWAR_LABELS = {
  Sa: 'Sa', Re_komal: 'Re\u266d', Re: 'Re', Ga_komal: 'Ga\u266d', Ga: 'Ga',
  Ma: 'Ma', Ma_tivra: 'Ma\u266f', Pa: 'Pa', Dha_komal: 'Dha\u266d', Dha: 'Dha',
  Ni_komal: 'Ni\u266d', Ni: 'Ni',
};

export default function MiniPlaybackWidgets({ hideTabla, hideTanpura }) {
  const { playbackState: tablaState } = useTablaPlayback();
  const { playbackState: tanpuraState } = useTanpuraPlayback();
  const { colors } = useTheme();

  const showTabla = !hideTabla && tablaState.isPlaying && tablaState.taal;
  const showTanpura = !hideTanpura && tanpuraState.isPlaying && tanpuraState.pattern;

  if (!showTabla && !showTanpura) return null;

  return (
    <View style={styles.wrapper}>
      {showTabla && (
        <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.bol, { color: colors.accent }]} numberOfLines={1}>
            {tablaState.taal.theka[tablaState.currentMatra]?.bols.join(' ') || '-'}
          </Text>
          <Text style={[styles.beat, { color: colors.text }]}>
            {tablaState.currentMatra + 1}
          </Text>
        </View>
      )}
      {showTanpura && (
        <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.bol, { color: colors.accent }]} numberOfLines={1}>
            {SWAR_LABELS[tanpuraState.pattern[tanpuraState.currentString]?.swar] || '-'}
          </Text>
          <Text style={[styles.beat, { color: colors.text }]}>
            S{tanpuraState.currentString + 1}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 8,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 100,
  },
  box: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bol: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  beat: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
});
