/**
 * Tanpura tab: choose your Sa on a harmonium keyboard, tune each of the
 * 4 strings (swar + saptak), set pluck speed, mix volumes, and play the
 * drone. The selected scale is saved and restored between launches.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { TanpuraEngine } from '../audio/TanpuraEngine';
import { SAMPLE_SET, SAMPLE_ROOT } from '../audio/tanpuraSamples';
import { useVolume } from '../audio/VolumeContext';
import { useTheme, spacing, radius, type } from '../utils/ThemeContext';
import { useTanpuraPlayback } from '../audio/TanpuraPlaybackContext';
import { getPreference, setPreference } from '../db/database';
import { Card } from '../components/ui/Card';
import PlayButton from '../components/ui/PlayButton';
import Slider from '../components/ui/Slider';

const SCALE_OPTIONS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

const SWAR_OPTIONS = [
  'Sa', 'Re_komal', 'Re', 'Ga_komal', 'Ga',
  'Ma', 'Ma_tivra', 'Pa', 'Dha_komal', 'Dha',
  'Ni_komal', 'Ni',
];

const SWAR_LABELS = {
  Sa: 'Sa', Re_komal: 'Re♭', Re: 'Re', Ga_komal: 'Ga♭', Ga: 'Ga',
  Ma: 'Ma', Ma_tivra: 'Ma♯', Pa: 'Pa', Dha_komal: 'Dha♭', Dha: 'Dha',
  Ni_komal: 'Ni♭', Ni: 'Ni',
};

const SAPTAK_OPTIONS = ['mandra', 'madhya', 'taar'];
const SAPTAK_LABELS = {
  mandra: 'Mandra', madhya: 'Madhya', taar: 'Taar',
};

/**
 * Semitone distance from the sample's recorded root to the chosen Sa,
 * wrapped to [-5, +6] so playback rates stay in a musical range.
 */
function scaleOffsetFor(scale) {
  const rootIdx = SCALE_OPTIONS.indexOf(SAMPLE_ROOT);
  const scaleIdx = SCALE_OPTIONS.indexOf(scale);
  return ((scaleIdx - rootIdx + 5 + 144) % 12) - 5;
}

// Traditional 4-string tuning: Pa (mandra) · Sa · Sa · Sa (mandra kharaj)
const DEFAULT_CONFIG = {
  pattern: [
    { swar: 'Pa', saptak: 'mandra' },
    { swar: 'Sa', saptak: 'madhya' },
    { swar: 'Sa', saptak: 'madhya' },
    { swar: 'Sa', saptak: 'mandra' },
  ],
  scaleOffset: 0,
  speed: 1.0,
};

// White keys in order, black keys sit between certain whites
const WHITE_NOTES = ['F', 'G', 'A', 'B', 'C', 'D', 'E'];
const BLACK_NOTES = [
  { note: 'F#', afterWhite: 0 },
  { note: 'G#', afterWhite: 1 },
  { note: 'A#', afterWhite: 2 },
  { note: 'C#', afterWhite: 4 },
  { note: 'D#', afterWhite: 5 },
];

function HarmoniumKeyboard({ selectedScale, onSelectScale, colors }) {
  const MAX_KEYBOARD_WIDTH = 350;
  const { width: screenWidth } = useWindowDimensions();
  const availableWidth = screenWidth - 40 - 24;
  const keyboardWidth = Math.min(availableWidth, MAX_KEYBOARD_WIDTH);
  const whiteKeyWidth = keyboardWidth / 7;
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const whiteKeyHeight = 84;
  const blackKeyHeight = 52;

  return (
    <View style={{ height: whiteKeyHeight + 4, marginTop: 14, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', height: whiteKeyHeight, width: keyboardWidth }}>
        {WHITE_NOTES.map((note) => {
          const isSelected = note === selectedScale;
          return (
            <TouchableOpacity
              key={note}
              activeOpacity={0.7}
              onPress={() => onSelectScale(note)}
              style={{
                width: whiteKeyWidth,
                height: whiteKeyHeight,
                backgroundColor: isSelected ? colors.accent : '#F7F5EF',
                borderWidth: 1,
                borderColor: colors.isDark ? '#00000055' : colors.border,
                borderBottomLeftRadius: 5,
                borderBottomRightRadius: 5,
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: 6,
              }}
            >
              <Text style={{
                fontSize: 10,
                fontWeight: isSelected ? 'bold' : '500',
                color: isSelected ? colors.onAccent : '#666',
              }}>
                {note}
              </Text>
              {isSelected && (
                <Text style={{
                  fontSize: 8,
                  fontWeight: 'bold',
                  color: colors.onAccent,
                  marginTop: 1,
                }}>
                  Sa
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Black keys overlaid */}
      {BLACK_NOTES.map(({ note, afterWhite }) => {
        const isSelected = note === selectedScale;
        const leftPos = (afterWhite + 1) * whiteKeyWidth - blackKeyWidth / 2 + (availableWidth > MAX_KEYBOARD_WIDTH ? (availableWidth - MAX_KEYBOARD_WIDTH) / 2 : 0);
        return (
          <TouchableOpacity
            key={note}
            activeOpacity={0.7}
            onPress={() => onSelectScale(note)}
            style={{
              position: 'absolute',
              left: leftPos,
              top: 0,
              width: blackKeyWidth,
              height: blackKeyHeight,
              backgroundColor: isSelected ? colors.accent : '#181818',
              borderBottomLeftRadius: 4,
              borderBottomRightRadius: 4,
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingBottom: 4,
              zIndex: 1,
            }}
          >
            <Text style={{
              fontSize: 8,
              fontWeight: isSelected ? 'bold' : '400',
              color: isSelected ? colors.onAccent : '#999',
            }}>
              {note}
            </Text>
            {isSelected && (
              <Text style={{
                fontSize: 7,
                fontWeight: 'bold',
                color: colors.onAccent,
                marginTop: 1,
              }}>
                Sa
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** One tanpura string as a vertical card; glows while it is sounding. */
function StringCard({ index, note, isSounding, isEditing, onPress, colors }) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSounding) {
      glow.setValue(1);
      Animated.timing(glow, {
        toValue: 0,
        duration: 700,
        useNativeDriver: false,
      }).start();
    }
  }, [isSounding]);

  const bg = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.accentSoft.replace(/[\d.]+\)$/, '0.45)')],
  });

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={{ flex: 1 }}>
      <Animated.View
        style={[
          stringStyles.card,
          {
            backgroundColor: bg,
            borderColor: isEditing ? colors.accent : colors.border,
          },
        ]}
      >
        <View style={[stringStyles.stringLine, { backgroundColor: isSounding ? colors.accent : colors.textTertiary }]} />
        <Text style={[stringStyles.swar, { color: colors.text }]}>
          {SWAR_LABELS[note.swar]}
        </Text>
        <Text style={[stringStyles.saptak, { color: colors.textSecondary }]}>
          {SAPTAK_LABELS[note.saptak]}
        </Text>
        <Text style={[stringStyles.number, { color: colors.textTertiary }]}>{index + 1}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const stringStyles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  stringLine: {
    width: 2,
    height: 22,
    borderRadius: 1,
    marginBottom: 8,
  },
  swar: {
    fontSize: 17,
    fontWeight: '700',
  },
  saptak: {
    fontSize: 11,
    marginTop: 2,
  },
  number: {
    fontSize: 10,
    marginTop: 6,
  },
});

export default function TanpuraScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [editingString, setEditingString] = useState(null);
  const [scaleIndex, setScaleIndex] = useState(SCALE_OPTIONS.indexOf(SAMPLE_ROOT));
  const engineRef = useRef(null);
  const [currentString, setCurrentString] = useState(0);
  const { colors } = useTheme();
  const { updatePlayback } = useTanpuraPlayback();

  const {
    masterVolume,
    tanpuraVolume,
    tablaVolume,
    updateMasterVolume,
    updateTanpuraVolume,
    updateTablaVolume,
    registerTanpuraEngine,
  } = useVolume();

  useEffect(() => {
    updatePlayback({ isPlaying, currentString, pattern: config.pattern });
  }, [isPlaying, currentString, config.pattern]);

  // Restore saved scale
  useEffect(() => {
    getPreference('tanpura_scale')
      .then((saved) => {
        if (saved && SCALE_OPTIONS.includes(saved)) {
          applyScale(SCALE_OPTIONS.indexOf(saved), false);
        }
      })
      .catch(() => {});
  }, []);

  const applyScale = (index, persist = true) => {
    setScaleIndex(index);
    const scale = SCALE_OPTIONS[index];
    const newConfig = { ...configRef.current, scaleOffset: scaleOffsetFor(scale) };
    configRef.current = newConfig;
    setConfig(newConfig);
    engineRef.current?.updateConfig({ scaleOffset: newConfig.scaleOffset });
    if (persist) setPreference('tanpura_scale', scale).catch(() => {});
  };

  // Keep a ref of config so async callbacks see the latest value
  const configRef = useRef(DEFAULT_CONFIG);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const cycleScale = (direction) => {
    const next = (scaleIndex + direction + SCALE_OPTIONS.length) % SCALE_OPTIONS.length;
    applyScale(next);
  };

  const togglePlayback = useCallback(async () => {
    if (!engineRef.current) {
      engineRef.current = new TanpuraEngine(SAMPLE_SET, configRef.current);
      engineRef.current.onString = (index) => {
        setCurrentString(index);
      };
      await engineRef.current.load();
      registerTanpuraEngine(engineRef.current);
    }

    if (isPlaying) {
      await engineRef.current.stop();
    } else {
      await engineRef.current.start();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const updateStringNote = (stringIndex, swar) => {
    const newPattern = [...config.pattern];
    newPattern[stringIndex] = { ...newPattern[stringIndex], swar };
    const newConfig = { ...config, pattern: newPattern };
    setConfig(newConfig);
    engineRef.current?.updateConfig({ pattern: newPattern });
  };

  const updateStringSaptak = (stringIndex, saptak) => {
    const newPattern = [...config.pattern];
    newPattern[stringIndex] = { ...newPattern[stringIndex], saptak };
    const newConfig = { ...config, pattern: newPattern };
    setConfig(newConfig);
    engineRef.current?.updateConfig({ pattern: newPattern });
  };

  const updateSpeed = (speed) => {
    const clamped = Math.max(0.5, Math.min(2.0, speed));
    const newConfig = { ...config, speed: clamped };
    setConfig(newConfig);
    engineRef.current?.updateConfig({ speed: clamped });
  };

  const styles = getStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Scale selector */}
      <Card label="Scale">
        <View style={styles.scaleRow}>
          <TouchableOpacity style={styles.scaleArrow} onPress={() => cycleScale(-1)}>
            <Text style={styles.scaleArrowText}>{'◀'}</Text>
          </TouchableOpacity>
          <View style={styles.scaleCenter}>
            <Text style={styles.scaleText}>{SCALE_OPTIONS[scaleIndex]}</Text>
            <Text style={styles.scaleSub}>Sa</Text>
          </View>
          <TouchableOpacity style={styles.scaleArrow} onPress={() => cycleScale(1)}>
            <Text style={styles.scaleArrowText}>{'▶'}</Text>
          </TouchableOpacity>
        </View>

        <HarmoniumKeyboard
          selectedScale={SCALE_OPTIONS[scaleIndex]}
          onSelectScale={(note) => applyScale(SCALE_OPTIONS.indexOf(note))}
          colors={colors}
        />
      </Card>

      {/* Strings */}
      <Text style={[type.label, styles.sectionLabel]}>Strings</Text>
      <View style={styles.patternContainer}>
        {config.pattern.map((note, i) => (
          <StringCard
            key={i}
            index={i}
            note={note}
            isSounding={isPlaying && currentString === i}
            isEditing={editingString === i}
            onPress={() => setEditingString(editingString === i ? null : i)}
            colors={colors}
          />
        ))}
      </View>

      {/* Note editor for selected string */}
      {editingString !== null && (
        <Card label={`String ${editingString + 1}`} elevated>
          <Text style={styles.editorLabel}>Swar</Text>
          <View style={styles.optionRow}>
            {SWAR_OPTIONS.map((swar) => {
              const active = config.pattern[editingString].swar === swar;
              return (
                <TouchableOpacity
                  key={swar}
                  style={[
                    styles.optionButton,
                    { backgroundColor: active ? colors.accent : colors.buttonBg },
                  ]}
                  onPress={() => updateStringNote(editingString, swar)}
                >
                  <Text style={[styles.optionText, { color: active ? colors.onAccent : colors.text }]}>
                    {SWAR_LABELS[swar]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.editorLabel}>Saptak</Text>
          <View style={styles.optionRow}>
            {SAPTAK_OPTIONS.map((saptak) => {
              const active = config.pattern[editingString].saptak === saptak;
              return (
                <TouchableOpacity
                  key={saptak}
                  style={[
                    styles.optionButton,
                    { backgroundColor: active ? colors.accent : colors.buttonBg },
                  ]}
                  onPress={() => updateStringSaptak(editingString, saptak)}
                >
                  <Text style={[styles.optionText, { color: active ? colors.onAccent : colors.text }]}>
                    {SAPTAK_LABELS[saptak]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      )}

      {/* Pluck speed */}
      <Card label={`Pluck speed · ${config.speed.toFixed(1)}×`}>
        <Slider
          value={(config.speed - 0.5) / 1.5}
          onValueChange={(r) => updateSpeed(Math.round((0.5 + r * 1.5) * 10) / 10)}
        />
      </Card>

      {/* Mixer */}
      <Card label="Mixer">
        <View style={{ gap: 14 }}>
          <Slider
            label="Master"
            value={masterVolume}
            onValueChange={updateMasterVolume}
            valueText={`${Math.round(masterVolume * 100)}%`}
          />
          <Slider
            label="Tanpura"
            value={tanpuraVolume}
            onValueChange={updateTanpuraVolume}
            valueText={`${Math.round(tanpuraVolume * 100)}%`}
          />
          <Slider
            label="Tabla"
            value={tablaVolume}
            onValueChange={updateTablaVolume}
            valueText={`${Math.round(tablaVolume * 100)}%`}
          />
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
    sectionLabel: {
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      marginLeft: 2,
    },
    scaleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scaleArrow: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.buttonBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scaleArrowText: {
      color: colors.accent,
      fontSize: 16,
    },
    scaleCenter: {
      alignItems: 'center',
      marginHorizontal: 28,
      minWidth: 60,
    },
    scaleText: {
      color: colors.text,
      fontSize: 36,
      fontWeight: '800',
    },
    scaleSub: {
      color: colors.textTertiary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: -2,
    },
    patternContainer: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
      marginHorizontal: -3,
    },
    editorLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    optionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: spacing.lg,
    },
    optionButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.sm,
    },
    optionText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });
