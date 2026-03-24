import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { TablaEngine } from '../audio/TablaEngine';
import { BUILT_IN_TAALS } from '../models/taals';
import { useVolume } from '../audio/VolumeContext';
import { useTheme } from '../utils/ThemeContext';
import { useTablaPlayback } from '../audio/TablaPlaybackContext';

const CONTAINER_PADDING = 20;
const MATRA_MIN_WIDTH = 50;
const MATRA_GAP = 6;

const DEFAULT_CONFIG = {
  taal: BUILT_IN_TAALS[0],
  bpm: 80,
  speed: 'madhya',
  pitchOffset: 0,
};

export default function TablaScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [currentMatra, setCurrentMatra] = useState(0);
  const [showTaalPicker, setShowTaalPicker] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const engineRef = useRef(null);
  const tapTimesRef = useRef([]);
  const tapTimeoutRef = useRef(null);

  const { registerTablaEngine } = useVolume();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { updatePlayback } = useTablaPlayback();

  // Sync playback state to context so other tabs can show the mini widget
  useEffect(() => {
    updatePlayback({ isPlaying, currentMatra, taal: config.taal, bpm: config.bpm });
  }, [isPlaying, currentMatra, config.taal, config.bpm]);

  // Recalculates on every render / resize
  const available = screenWidth - CONTAINER_PADDING * 2;
  const needed = config.taal.matras * MATRA_MIN_WIDTH + (config.taal.matras - 1) * MATRA_GAP;
  const showTheka = needed <= available;

  const initEngine = useCallback(async () => {
    if (engineRef.current) return;

    const bolSamples = {};
    engineRef.current = new TablaEngine(bolSamples, config);

    engineRef.current.onMatra = (index) => {
      setCurrentMatra(index);
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
    const newConfig = { ...config, taal };
    setConfig(newConfig);
    setShowTaalPicker(false);
    setCurrentMatra(0);

    if (engineRef.current) {
      if (isPlaying) {
        engineRef.current.queueTaalChange(taal);
      } else {
        engineRef.current.setTaal(taal);
      }
    }
  };

  const adjustBpm = (delta) => {
    const newBpm = Math.max(1, Math.min(400, config.bpm + delta));
    const newConfig = { ...config, bpm: newBpm };
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
      const totalMs = taps[taps.length - 1] - taps[0];
      const intervals = taps.length - 1;
      const avgMs = totalMs / intervals;
      const tappedBpm = Math.round(60000 / avgMs);
      const clampedBpm = Math.max(1, Math.min(400, tappedBpm));

      const newConfig = { ...config, bpm: clampedBpm };
      setConfig(newConfig);
      engineRef.current?.updateConfig(newConfig);
    }

    tapTimeoutRef.current = setTimeout(() => {
      setIsTapping(false);
      tapTimesRef.current = [];
    }, 2000);
  };

  const setBpmFromSlider = (locationX) => {
    const w = screenWidth - CONTAINER_PADDING * 2 - 108;
    const ratio = Math.max(0, Math.min(1, locationX / w));
    const newBpm = Math.round(1 + ratio * 399);
    const newConfig = { ...config, bpm: newBpm };
    setConfig(newConfig);
    engineRef.current?.updateConfig(newConfig);
  };

  const getVibhagIndex = (matraIndex) => {
    let count = 0;
    for (let v = 0; v < config.taal.vibhag.length; v++) {
      count += config.taal.vibhag[v];
      if (matraIndex < count) return v;
    }
    return 0;
  };

  const isVibhagStart = (matraIndex) => {
    let count = 0;
    for (const v of config.taal.vibhag) {
      if (matraIndex === count) return true;
      count += v;
    }
    return false;
  };

  const styles = getStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tabla</Text>

      {/* Current taal */}
      <TouchableOpacity
        style={styles.taalSelector}
        onPress={() => setShowTaalPicker(!showTaalPicker)}
      >
        <Text style={styles.taalName}>{config.taal.name}</Text>
        <Text style={styles.taalMeta}>
          {config.taal.matras} matras
        </Text>
        <Text style={styles.taalChangeHint}>
          {showTaalPicker ? 'Close' : 'Change Taal'}
        </Text>
      </TouchableOpacity>

      {/* Taal picker */}
      {showTaalPicker && (
        <View style={styles.taalList}>
          {BUILT_IN_TAALS.map((taal) => (
            <TouchableOpacity
              key={taal.id}
              style={[
                styles.taalOption,
                config.taal.id === taal.id && styles.taalOptionActive,
              ]}
              onPress={() => selectTaal(taal)}
            >
              <Text
                style={[
                  styles.taalOptionText,
                  config.taal.id === taal.id && styles.taalOptionTextActive,
                ]}
              >
                {taal.name} ({taal.matras})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Theka display -- hidden entirely if it would need to wrap */}
      {showTheka && (
        <View style={styles.thekaContainer}>
          {config.taal.theka.map((matra, i) => {
            const vibhagIdx = getVibhagIndex(i);
            const isKhali = config.taal.khaliVibhag.includes(vibhagIdx);
            const isSam = i === 0;
            const isActive = i === currentMatra && isPlaying;

            return (
              <View key={i} style={styles.matraWrapper}>
                {isVibhagStart(i) && (
                  <Text style={styles.vibhagMarker}>
                    {isSam ? 'X' : isKhali ? '0' : '|'}
                  </Text>
                )}
                <View
                  style={[
                    styles.matraBox,
                    isActive && styles.matraBoxActive,
                    isSam && styles.matraBoxSam,
                  ]}
                >
                  <Text
                    style={[
                      styles.matraText,
                      isActive && styles.matraTextActive,
                    ]}
                  >
                    {matra.bols.join(' ')}
                  </Text>
                </View>
                <Text style={styles.matraNumber}>{i + 1}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Info box: bol, beat, BPM all in one bordered square */}
      <TouchableOpacity
        style={styles.infoBox}
        onPress={handleTapTempo}
        activeOpacity={0.7}
      >
        {isTapping && (
          <View style={styles.recordingDotRow}>
            <View style={styles.recordingDot} />
          </View>
        )}

        <Text style={styles.infoBol}>
          {config.taal.theka[currentMatra]?.bols.join(' ') || '-'}
        </Text>
        <Text style={styles.infoBeat}>{currentMatra + 1}</Text>
        <Text style={styles.infoBpm}>{config.bpm} BPM</Text>

        <Text style={styles.tapHint}>
          {isTapping ? 'Keep tapping...' : 'Tap to set BPM'}
        </Text>
      </TouchableOpacity>

      {/* BPM slider with -5 / +5 */}
      <View style={styles.sliderSection}>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.bpmNudge}
            onPress={() => adjustBpm(-5)}
          >
            <Text style={styles.bpmNudgeText}>-5</Text>
          </TouchableOpacity>

          <View
            style={styles.sliderTrack}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) =>
              setBpmFromSlider(e.nativeEvent.locationX)
            }
            onResponderMove={(e) =>
              setBpmFromSlider(e.nativeEvent.locationX)
            }
          >
            <View
              style={[
                styles.sliderFill,
                { width: `${((config.bpm - 1) / 399) * 100}%` },
              ]}
            />
            <View
              style={[
                styles.sliderThumb,
                { left: `${((config.bpm - 1) / 399) * 100}%` },
              ]}
            />
          </View>

          <TouchableOpacity
            style={styles.bpmNudge}
            onPress={() => adjustBpm(5)}
          >
            <Text style={styles.bpmNudgeText}>+5</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabelText}>1</Text>
          <Text style={styles.sliderLabelText}>400</Text>
        </View>
      </View>

      {/* Play/Stop */}
      <TouchableOpacity
        style={[styles.playButton, isPlaying && styles.playButtonActive]}
        onPress={togglePlayback}
      >
        <Text style={styles.playButtonText}>
          {isPlaying ? 'Stop' : 'Play'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: CONTAINER_PADDING,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.accent,
      textAlign: 'center',
      marginBottom: 24,
    },
    taalSelector: {
      borderWidth: 1.5,
      borderColor: colors.accent,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      alignItems: 'center',
    },
    taalName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    taalMeta: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    taalChangeHint: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 8,
    },
    taalList: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 8,
      marginBottom: 16,
    },
    taalOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    taalOptionActive: {
      backgroundColor: colors.buttonBg,
    },
    taalOptionText: {
      color: colors.text,
      fontSize: 16,
    },
    taalOptionTextActive: {
      color: colors.accent,
      fontWeight: '600',
    },
    thekaContainer: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: MATRA_GAP,
      marginBottom: 24,
      justifyContent: 'center',
    },
    matraWrapper: {
      alignItems: 'center',
      minWidth: MATRA_MIN_WIDTH,
    },
    vibhagMarker: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 2,
    },
    matraBox: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 8,
      minWidth: MATRA_MIN_WIDTH,
      alignItems: 'center',
    },
    matraBoxActive: {
      backgroundColor: colors.accent,
    },
    matraBoxSam: {
      borderWidth: 2,
      borderColor: colors.accent,
    },
    matraText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '500',
    },
    matraTextActive: {
      color: colors.background,
      fontWeight: 'bold',
    },
    matraNumber: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 2,
    },
    infoBox: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      alignItems: 'center',
      alignSelf: 'center',
      aspectRatio: 1,
      justifyContent: 'center',
      minWidth: 160,
    },
    recordingDotRow: {
      position: 'absolute',
      top: 10,
      right: 10,
    },
    recordingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.danger,
    },
    infoBol: {
      color: colors.accent,
      fontSize: 36,
      fontWeight: 'bold',
    },
    infoBeat: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 6,
    },
    infoBpm: {
      color: colors.textSecondary,
      fontSize: 16,
      marginTop: 4,
      marginBottom: 8,
    },
    tapHint: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    sliderSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    sliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bpmNudge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.buttonBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bpmNudgeText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: 'bold',
    },
    sliderTrack: {
      flex: 1,
      height: 8,
      backgroundColor: colors.background,
      borderRadius: 4,
      justifyContent: 'center',
      overflow: 'visible',
    },
    sliderFill: {
      height: 8,
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    sliderThumb: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent,
      marginLeft: -12,
      top: -8,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
      paddingHorizontal: 54,
    },
    sliderLabelText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    playButton: {
      backgroundColor: colors.buttonBg,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      marginBottom: 40,
    },
    playButtonActive: {
      backgroundColor: colors.danger,
    },
    playButtonText: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
    },
  });
