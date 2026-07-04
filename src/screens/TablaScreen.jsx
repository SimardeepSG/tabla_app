/**
 * Tabla tab: pick a taal (built-in or your own), see its theka laid out by
 * vibhag, set the tempo (slider, nudge buttons, or tap tempo), and play.
 * Changing taal mid-play queues the switch for the next sam (partaal).
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { TablaEngine } from '../audio/TablaEngine';
import { STROKE_SAMPLES } from '../audio/tablaSamples';
import { BUILT_IN_TAALS } from '../models/taals';
import { getCustomTaals } from '../db/database';
import { useVolume } from '../audio/VolumeContext';
import { useTheme, spacing, radius, type } from '../utils/ThemeContext';
import { useTablaPlayback } from '../audio/TablaPlaybackContext';
import { Card } from '../components/ui/Card';
import PlayButton from '../components/ui/PlayButton';
import Slider from '../components/ui/Slider';

const BPM_MIN = 20;
const BPM_MAX = 300;

const DEFAULT_CONFIG = {
  taal: BUILT_IN_TAALS[0],
  bpm: 80,
};

/**
 * Traditional vibhag markings: sam is X, khali vibhags are 0,
 * remaining tali vibhags count 2, 3, ... skipping khalis.
 */
function vibhagLabels(taal) {
  const labels = [];
  let tali = 2;
  for (let v = 0; v < taal.vibhag.length; v++) {
    const isKhali = taal.khaliVibhag.includes(v);
    if (v === 0 && !isKhali) {
      labels.push('X');
    } else if (isKhali) {
      labels.push('0');
    } else {
      labels.push(String(tali++));
    }
  }
  return labels;
}

/** Split the flat theka into per-vibhag chunks. */
function vibhagChunks(taal) {
  const chunks = [];
  let start = 0;
  for (const len of taal.vibhag) {
    chunks.push({ start, matras: taal.theka.slice(start, start + len) });
    start += len;
  }
  return chunks;
}

export default function TablaScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [currentMatra, setCurrentMatra] = useState(0);
  const [showTaalPicker, setShowTaalPicker] = useState(false);
  const [customTaals, setCustomTaals] = useState([]);
  const [pendingTaal, setPendingTaal] = useState(null);
  const [isTapping, setIsTapping] = useState(false);
  const engineRef = useRef(null);
  const pendingTaalRef = useRef(null);
  const tapTimesRef = useRef([]);
  const tapTimeoutRef = useRef(null);
  const beatPulse = useRef(new Animated.Value(1)).current;

  const { registerTablaEngine } = useVolume();
  const { colors } = useTheme();
  const { updatePlayback } = useTablaPlayback();

  // Sync playback state to context so other tabs can show the mini widget
  useEffect(() => {
    updatePlayback({ isPlaying, currentMatra, taal: config.taal, bpm: config.bpm });
  }, [isPlaying, currentMatra, config.taal, config.bpm]);

  // Pick up custom taals created in the editor whenever this tab gains focus
  useFocusEffect(
    useCallback(() => {
      getCustomTaals()
        .then(setCustomTaals)
        .catch(() => {});
    }, [])
  );

  // Small pulse on each beat
  useEffect(() => {
    if (!isPlaying) return;
    beatPulse.setValue(1.06);
    Animated.spring(beatPulse, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [currentMatra, isPlaying]);

  const initEngine = useCallback(async () => {
    if (engineRef.current) return;

    engineRef.current = new TablaEngine(STROKE_SAMPLES, config);
    engineRef.current.onMatra = (index) => {
      setCurrentMatra(index);
    };
    engineRef.current.onSam = () => {
      if (pendingTaalRef.current) {
        const taal = pendingTaalRef.current;
        pendingTaalRef.current = null;
        setPendingTaal(null);
        setConfig((c) => ({ ...c, taal }));
      }
    };

    await engineRef.current.load();
    registerTablaEngine(engineRef.current);
  }, [config]);

  const togglePlayback = useCallback(async () => {
    await initEngine();
    if (!engineRef.current) return;

    if (isPlaying) {
      await engineRef.current.stop();
    } else {
      await engineRef.current.start();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, initEngine]);

  const selectTaal = (taal) => {
    setShowTaalPicker(false);

    if (engineRef.current && isPlaying) {
      // Partaal: takes effect on the next sam; the UI follows when it lands
      engineRef.current.queueTaalChange(taal);
      pendingTaalRef.current = taal;
      setPendingTaal(taal);
    } else {
      setConfig((c) => ({ ...c, taal }));
      setCurrentMatra(0);
      engineRef.current?.setTaal(taal);
    }
  };

  const setBpm = (newBpm) => {
    const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(newBpm)));
    const newConfig = { ...config, bpm: clamped };
    setConfig(newConfig);
    engineRef.current?.updateConfig(newConfig);
  };

  const handleTapTempo = () => {
    const now = Date.now();

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    setIsTapping(true);
    tapTimesRef.current.push(now);

    if (tapTimesRef.current.length >= 2) {
      const taps = tapTimesRef.current;
      const avgMs = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
      setBpm(60000 / avgMs);
    }

    tapTimeoutRef.current = setTimeout(() => {
      setIsTapping(false);
      tapTimesRef.current = [];
    }, 2000);
  };

  const allTaals = [...BUILT_IN_TAALS, ...customTaals];
  const labels = vibhagLabels(config.taal);
  const chunks = vibhagChunks(config.taal);
  const currentBols = config.taal.theka[currentMatra]?.bols.join(' ') || '-';

  const styles = getStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Taal selector */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.taalSelector}
        onPress={() => setShowTaalPicker(!showTaalPicker)}
      >
        <View style={{ flex: 1 }}>
          <Text style={[type.label, { color: colors.textSecondary }]}>Taal</Text>
          <Text style={styles.taalName}>{config.taal.name}</Text>
          <Text style={styles.taalMeta}>
            {config.taal.matras} matras · {config.taal.vibhag.join(' + ')}
          </Text>
          {pendingTaal && (
            <Text style={[styles.pendingText, { color: colors.success }]}>
              → {pendingTaal.name} on next sam
            </Text>
          )}
        </View>
        <View style={[styles.chevron, { backgroundColor: colors.accentSoft }]}>
          <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700' }}>
            {showTaalPicker ? '×' : '▾'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Taal picker */}
      {showTaalPicker && (
        <Card style={{ paddingVertical: spacing.sm }}>
          {allTaals.map((taal, idx) => {
            const isActive = config.taal.id === taal.id;
            const firstCustom = taal.isCustom && !allTaals[idx - 1]?.isCustom;
            return (
              <View key={taal.id}>
                {firstCustom && (
                  <Text style={[type.label, styles.pickerDivider, { color: colors.textTertiary }]}>
                    Your taals
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.taalOption, isActive && { backgroundColor: colors.accentSoft }]}
                  onPress={() => selectTaal(taal)}
                >
                  <Text style={[styles.taalOptionText, isActive && { color: colors.accent, fontWeight: '700' }]}>
                    {taal.name}
                  </Text>
                  <Text style={[styles.taalOptionMeta, { color: colors.textTertiary }]}>
                    {taal.matras}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </Card>
      )}

      {/* Theka, grouped by vibhag; wraps on narrow screens instead of hiding */}
      <View style={styles.thekaContainer}>
        {chunks.map((chunk, v) => {
          const isKhali = config.taal.khaliVibhag.includes(v);
          return (
            <View key={v} style={styles.vibhagGroup}>
              <Text
                style={[
                  styles.vibhagMarker,
                  { color: isKhali ? colors.textTertiary : colors.accent },
                ]}
              >
                {labels[v]}
              </Text>
              <View style={styles.vibhagRow}>
                {chunk.matras.map((matra, j) => {
                  const i = chunk.start + j;
                  const isActive = i === currentMatra && isPlaying;
                  const isSam = i === 0;
                  return (
                    <View key={i} style={styles.matraWrapper}>
                      <View
                        style={[
                          styles.matraBox,
                          { backgroundColor: colors.surface, borderColor: 'transparent' },
                          isSam && { borderColor: colors.accent },
                          isActive && { backgroundColor: colors.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.matraText,
                            { color: isActive ? colors.onAccent : colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {matra.bols.join(' ')}
                        </Text>
                      </View>
                      <Text style={[styles.matraNumber, { color: colors.textTertiary }]}>
                        {i + 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Beat display; tap to set tempo */}
      <TouchableOpacity activeOpacity={0.85} onPress={handleTapTempo}>
        <Animated.View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: isTapping ? colors.accent : colors.border,
              transform: [{ scale: beatPulse }],
            },
          ]}
        >
          {isTapping && <View style={[styles.recordingDot, { backgroundColor: colors.danger }]} />}
          <Text style={[styles.infoBol, { color: colors.accent }]} numberOfLines={1}>
            {currentBols}
          </Text>
          <Text style={[styles.infoBeat, { color: colors.text }]}>
            beat {currentMatra + 1}
            <Text style={{ color: colors.textTertiary }}> / {config.taal.matras}</Text>
          </Text>
          <Text style={[styles.tapHint, { color: colors.textTertiary }]}>
            {isTapping ? 'keep tapping…' : 'tap in tempo to set BPM'}
          </Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Tempo */}
      <Card label={`Tempo · ${config.bpm} BPM`}>
        <View style={styles.bpmRow}>
          <TouchableOpacity
            style={[styles.bpmNudge, { backgroundColor: colors.buttonBg }]}
            onPress={() => setBpm(config.bpm - 5)}
          >
            <Text style={[styles.bpmNudgeText, { color: colors.text }]}>−5</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Slider
              value={(config.bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)}
              onValueChange={(r) => setBpm(BPM_MIN + r * (BPM_MAX - BPM_MIN))}
            />
          </View>
          <TouchableOpacity
            style={[styles.bpmNudge, { backgroundColor: colors.buttonBg }]}
            onPress={() => setBpm(config.bpm + 5)}
          >
            <Text style={[styles.bpmNudgeText, { color: colors.text }]}>+5</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bpmScaleRow}>
          <Text style={[styles.bpmScaleText, { color: colors.textTertiary }]}>{BPM_MIN}</Text>
          <Text style={[styles.bpmScaleText, { color: colors.textTertiary }]}>{BPM_MAX}</Text>
        </View>
      </Card>

      <PlayButton
        isPlaying={isPlaying}
        onPress={togglePlayback}
        label={isPlaying ? 'Stop' : 'Play'}
      />
    </ScrollView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      paddingBottom: 48,
    },
    taalSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    taalName: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
    },
    taalMeta: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    pendingText: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    chevron: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerDivider: {
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      marginHorizontal: spacing.md,
    },
    taalOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
    },
    taalOptionText: {
      color: colors.text,
      fontSize: 16,
    },
    taalOptionMeta: {
      fontSize: 13,
    },
    thekaContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      rowGap: spacing.md,
      columnGap: spacing.lg,
      marginBottom: spacing.xl,
    },
    vibhagGroup: {
      alignItems: 'flex-start',
    },
    vibhagMarker: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 4,
      marginLeft: 2,
    },
    vibhagRow: {
      flexDirection: 'row',
      gap: 5,
    },
    matraWrapper: {
      alignItems: 'center',
    },
    matraBox: {
      borderRadius: radius.sm,
      borderWidth: 1.5,
      paddingVertical: 9,
      paddingHorizontal: 6,
      minWidth: 46,
      alignItems: 'center',
    },
    matraText: {
      fontSize: 12,
      fontWeight: '600',
    },
    matraNumber: {
      fontSize: 10,
      marginTop: 3,
    },
    infoBox: {
      borderWidth: 1.5,
      borderRadius: radius.xl,
      paddingVertical: 24,
      marginBottom: spacing.lg,
      alignItems: 'center',
    },
    recordingDot: {
      position: 'absolute',
      top: 12,
      right: 14,
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    infoBol: {
      fontSize: 40,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    infoBeat: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 6,
    },
    tapHint: {
      fontSize: 12,
      marginTop: 10,
    },
    bpmRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    bpmNudge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bpmNudgeText: {
      fontSize: 14,
      fontWeight: '700',
    },
    bpmScaleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
      paddingHorizontal: 56,
    },
    bpmScaleText: {
      fontSize: 11,
    },
  });
