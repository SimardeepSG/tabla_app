/**
 * Tabla tab: pick a taal (built-in or your own), see its theka laid out by
 * vibhag, set the tempo (slider, nudge buttons, or tap tempo), and play.
 * Changing taal mid-play queues the switch for the next sam (partaal).
 *
 * Two display modes (persisted, toggle at the top):
 *   - Focus (default): one big box showing only the current beat's bol(s),
 *     with the vibhag marker (X / 0 / 2 / 3 …) in the corner.
 *   - Full: the whole theka laid out by vibhag with a per-beat highlight.
 * Each theka cell is a memoized MatraBox, so advancing the beat only
 * re-renders the two cells whose highlight changed, not the whole grid.
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const VIEW_STORAGE_KEY = '@tabla_app_view';

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

/**
 * Which vibhag the given matra sits in, its marker label, whether it's the
 * first matra of that vibhag (the clap/wave/sam moment) and whether it's khali.
 */
function vibhagMarkerFor(taal, labels, matra) {
  let start = 0;
  for (let v = 0; v < taal.vibhag.length; v++) {
    const len = taal.vibhag[v];
    if (matra >= start && matra < start + len) {
      return {
        label: labels[v],
        isStart: matra === start,
        isKhali: taal.khaliVibhag.includes(v),
      };
    }
    start += len;
  }
  return null;
}

/**
 * One theka cell. Memoized: it only re-renders when its own props change
 * (bols by value, or its active/sam flags), so advancing the beat re-renders
 * just the cell that lit up and the one that went dark.
 */
const MatraBox = React.memo(function MatraBox({ bols, number, isActive, isSam, colors, styles }) {
  return (
    <View style={styles.matraWrapper}>
      <View
        style={[
          styles.matraBox,
          { backgroundColor: colors.surface, borderColor: 'transparent' },
          isSam && { borderColor: colors.accent },
          isActive && { backgroundColor: colors.accent },
        ]}
      >
        <Text
          style={[styles.matraText, { color: isActive ? colors.onAccent : colors.text }]}
          numberOfLines={1}
        >
          {bols}
        </Text>
      </View>
      <Text style={[styles.matraNumber, { color: colors.textTertiary }]}>{number}</Text>
    </View>
  );
});

/**
 * Focus view: a single large box showing only the current beat's bol(s), the
 * vibhag marker in the corner, and doubling as the tap-tempo target.
 */
function FocusDisplay({
  bols, beatNumber, totalBeats, marker, isSam, isPlaying, isTapping, onTapTempo, colors, styles,
}) {
  const showSamBorder = isSam && isPlaying;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onTapTempo}>
      <Animated.View
        style={[
          styles.focusBox,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: showSamBorder ? colors.accent : colors.border,
          },
        ]}
      >
        {/* Corner vibhag marker shows only on a vibhag boundary (sam / clap /
            khali) — the beats where it's musically meaningful. */}
        {marker?.isStart && (
          <View
            style={[
              styles.focusMarker,
              { backgroundColor: marker.isKhali ? colors.buttonBg : colors.accentSoft },
            ]}
          >
            <Text
              style={[
                styles.focusMarkerText,
                { color: marker.isKhali ? colors.textSecondary : colors.accent },
              ]}
            >
              {marker.label}
            </Text>
          </View>
        )}
        {isTapping && <View style={[styles.recordingDot, { backgroundColor: colors.danger }]} />}
        <Text
          style={[styles.focusBol, { color: colors.accent }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {bols}
        </Text>
        <Text style={[styles.focusBeat, { color: colors.text }]}>
          beat {beatNumber}
          <Text style={{ color: colors.textTertiary }}> / {totalBeats}</Text>
        </Text>
        <Text style={[styles.tapHint, { color: colors.textTertiary }]}>
          {isTapping ? 'keep tapping…' : 'tap in tempo to set BPM'}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TablaScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [currentMatra, setCurrentMatra] = useState(0);
  const [showTaalPicker, setShowTaalPicker] = useState(false);
  const [customTaals, setCustomTaals] = useState([]);
  const [pendingTaal, setPendingTaal] = useState(null);
  const [isTapping, setIsTapping] = useState(false);
  const [viewMode, setViewMode] = useState('focus');
  const engineRef = useRef(null);
  const pendingTaalRef = useRef(null);
  const tapTimesRef = useRef([]);
  const tapTimeoutRef = useRef(null);

  const { registerTablaEngine } = useVolume();
  const { colors } = useTheme();
  const { updatePlayback } = useTablaPlayback();

  // Load the persisted view preference once.
  useEffect(() => {
    AsyncStorage.getItem(VIEW_STORAGE_KEY)
      .then((v) => {
        if (v === 'focus' || v === 'full') setViewMode(v);
      })
      .catch(() => {});
  }, []);

  const changeView = (mode) => {
    setViewMode(mode);
    AsyncStorage.setItem(VIEW_STORAGE_KEY, mode).catch(() => {});
  };

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

  // Derived per-taal layout — recomputed only when the taal changes, not on
  // every beat (currentMatra changes) or theme render.
  const styles = useMemo(() => getStyles(colors), [colors]);
  const labels = useMemo(() => vibhagLabels(config.taal), [config.taal]);
  const chunks = useMemo(() => vibhagChunks(config.taal), [config.taal]);

  const currentBols = config.taal.theka[currentMatra]?.bols.join(' ') || '-';
  const marker = vibhagMarkerFor(config.taal, labels, currentMatra);

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

      {/* View toggle: Focus (single box) vs Full (whole theka) */}
      <View style={[styles.viewToggle, { backgroundColor: colors.surface }]}>
        {[
          { key: 'focus', label: 'Focus' },
          { key: 'full', label: 'Full' },
        ].map((opt) => {
          const active = viewMode === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.8}
              style={[styles.viewToggleOption, active && { backgroundColor: colors.accent }]}
              onPress={() => changeView(opt.key)}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  { color: active ? colors.onAccent : colors.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {viewMode === 'focus' ? (
        <FocusDisplay
          bols={currentBols}
          beatNumber={currentMatra + 1}
          totalBeats={config.taal.matras}
          marker={marker}
          isSam={currentMatra === 0}
          isPlaying={isPlaying}
          isTapping={isTapping}
          onTapTempo={handleTapTempo}
          colors={colors}
          styles={styles}
        />
      ) : (
        <>
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
                      return (
                        <MatraBox
                          key={i}
                          bols={matra.bols.join(' ')}
                          number={i + 1}
                          isActive={i === currentMatra && isPlaying}
                          isSam={i === 0}
                          colors={colors}
                          styles={styles}
                        />
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
        </>
      )}

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
    viewToggle: {
      flexDirection: 'row',
      alignSelf: 'center',
      borderRadius: radius.full,
      padding: 3,
      marginBottom: spacing.lg,
    },
    viewToggleOption: {
      paddingVertical: 7,
      paddingHorizontal: 22,
      borderRadius: radius.full,
    },
    viewToggleText: {
      fontSize: 13,
      fontWeight: '700',
    },
    focusBox: {
      borderWidth: 1.5,
      borderRadius: radius.xl,
      paddingVertical: 52,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 208,
    },
    focusMarker: {
      position: 'absolute',
      top: 14,
      left: 16,
      minWidth: 34,
      height: 34,
      paddingHorizontal: 8,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    focusMarkerText: {
      fontSize: 16,
      fontWeight: '800',
    },
    focusBol: {
      fontSize: 52,
      fontWeight: '800',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    focusBeat: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 10,
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
