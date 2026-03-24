import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { TanpuraEngine } from '../audio/TanpuraEngine';
import { useVolume } from '../audio/VolumeContext';
import { useTheme } from '../utils/ThemeContext';
import { useTanpuraPlayback } from '../audio/TanpuraPlaybackContext';

const SCALE_OPTIONS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

const SWAR_OPTIONS = [
  'Sa', 'Re_komal', 'Re', 'Ga_komal', 'Ga',
  'Ma', 'Ma_tivra', 'Pa', 'Dha_komal', 'Dha',
  'Ni_komal', 'Ni',
];

const SWAR_LABELS = {
  Sa: 'Sa', Re_komal: 'Re\u266d', Re: 'Re', Ga_komal: 'Ga\u266d', Ga: 'Ga',
  Ma: 'Ma', Ma_tivra: 'Ma\u266f', Pa: 'Pa', Dha_komal: 'Dha\u266d', Dha: 'Dha',
  Ni_komal: 'Ni\u266d', Ni: 'Ni',
};

const SAPTAK_OPTIONS = ['mandra', 'madhya', 'taar'];
const SAPTAK_LABELS = {
  mandra: 'Mandra', madhya: 'Madhya', taar: 'Taar',
};

const DEFAULT_CONFIG = {
  pattern: [
    { swar: 'Sa', saptak: 'madhya' },
    { swar: 'Pa', saptak: 'madhya' },
    { swar: 'Sa', saptak: 'taar' },
    { swar: 'Sa', saptak: 'taar' },
  ],
  basePitchHz: 261.63,
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
  const whiteKeyHeight = 80;
  const blackKeyHeight = 50;

  return (
    <View style={{ height: whiteKeyHeight + 4, marginTop: 12, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', height: whiteKeyHeight, width: keyboardWidth }}>
        {WHITE_NOTES.map((note, i) => {
          const isSelected = note === selectedScale;
          return (
            <TouchableOpacity
              key={note}
              activeOpacity={0.7}
              onPress={() => onSelectScale(note)}
              style={{
                width: whiteKeyWidth,
                height: whiteKeyHeight,
                backgroundColor: isSelected ? colors.accent : '#F5F5F0',
                borderWidth: 1,
                borderColor: colors.border,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: 6,
              }}
            >
              <Text style={{
                fontSize: 10,
                fontWeight: isSelected ? 'bold' : '400',
                color: isSelected ? colors.background : '#666',
              }}>
                {note}
              </Text>
              {isSelected && (
                <Text style={{
                  fontSize: 8,
                  fontWeight: 'bold',
                  color: colors.background,
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
        const halfKeyboard = (MAX_KEYBOARD_WIDTH - keyboardWidth) / 2;
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
              backgroundColor: isSelected ? colors.accent : '#1A1A1A',
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
              color: isSelected ? colors.background : '#999',
            }}>
              {note}
            </Text>
            {isSelected && (
              <Text style={{
                fontSize: 7,
                fontWeight: 'bold',
                color: colors.background,
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

function VolumeSlider({ label, value, onValueChange, colors }) {
  const percentage = Math.round(value * 100);
  const trackRef = useRef(null);
  const trackXRef = useRef(0);
  const trackWidthRef = useRef(200);

  const handleLayout = () => {
    if (trackRef.current) {
      trackRef.current.measure((x, y, width, height, pageX) => {
        trackXRef.current = pageX;
        trackWidthRef.current = width;
      });
    }
  };

  const handleTouch = (e) => {
    const pageX = e.nativeEvent.pageX;
    const ratio = Math.max(0, Math.min(1, (pageX - trackXRef.current) / trackWidthRef.current));
    onValueChange(Math.round(ratio * 100) / 100);
  };

  return (
    <View style={volStyles.row}>
      <Text style={[volStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        ref={trackRef}
        style={[volStyles.track, { backgroundColor: colors.background }]}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      >
        <View style={[volStyles.fill, { width: `${percentage}%`, backgroundColor: colors.accent }]} />
        <View style={[volStyles.thumb, { left: `${percentage}%`, backgroundColor: colors.accent }]} />
      </View>
      <Text style={[volStyles.pct, { color: colors.textSecondary }]}>{percentage}%</Text>
    </View>
  );
}

const volStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    width: 70,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    justifyContent: 'center',
    overflow: 'visible',
    marginHorizontal: 10,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    top: -6,
  },
  pct: {
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
});

export default function TanpuraScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [editingString, setEditingString] = useState(null);
  const [scaleIndex, setScaleIndex] = useState(0);
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

  const cycleScale = (direction) => {
    setScaleIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return SCALE_OPTIONS.length - 1;
      if (next >= SCALE_OPTIONS.length) return 0;
      return next;
    });
  };

  const togglePlayback = useCallback(async () => {
    if (!engineRef.current) {
      const placeholderSample = require('../../assets/samples/tanpura/sa.wav');
      engineRef.current = new TanpuraEngine(placeholderSample, config);
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
  }, [isPlaying, config]);

  const updateStringNote = (stringIndex, swar) => {
    const newPattern = [...config.pattern];
    newPattern[stringIndex] = { ...newPattern[stringIndex], swar };
    const newConfig = { ...config, pattern: newPattern };
    setConfig(newConfig);
    engineRef.current?.updateConfig(newConfig);
  };

  const updateStringSaptak = (stringIndex, saptak) => {
    const newPattern = [...config.pattern];
    newPattern[stringIndex] = { ...newPattern[stringIndex], saptak };
    const newConfig = { ...config, pattern: newPattern };
    setConfig(newConfig);
    engineRef.current?.updateConfig(newConfig);
  };

  const updateSpeed = (delta) => {
    const newSpeed = Math.max(0.5, Math.min(2.0, config.speed + delta));
    const newConfig = { ...config, speed: newSpeed };
    setConfig(newConfig);
    engineRef.current?.updateConfig(newConfig);
  };

  const noteLabel = (note) =>
    `${SWAR_LABELS[note.swar]} (${SAPTAK_LABELS[note.saptak]})`;

  const styles = getStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tanpura</Text>

      {/* Scale selector — at the top */}
      <View style={styles.scaleSection}>
        <View style={styles.scaleRow}>
          <TouchableOpacity style={styles.scaleArrow} onPress={() => cycleScale(-1)}>
            <Text style={styles.scaleArrowText}>{'\u25C0'}</Text>
          </TouchableOpacity>
          <View style={styles.scaleCenter}>
            <Text style={styles.scaleLabelSmall}>Scale</Text>
            <Text style={styles.scaleText}>{SCALE_OPTIONS[scaleIndex]}</Text>
          </View>
          <TouchableOpacity style={styles.scaleArrow} onPress={() => cycleScale(1)}>
            <Text style={styles.scaleArrowText}>{'\u25B6'}</Text>
          </TouchableOpacity>
        </View>

        {/* Harmonium keyboard */}
        <HarmoniumKeyboard
          selectedScale={SCALE_OPTIONS[scaleIndex]}
          onSelectScale={(note) => setScaleIndex(SCALE_OPTIONS.indexOf(note))}
          colors={colors}
        />
      </View>

      {/* Master volume */}
      <View style={styles.volumeSection}>
        <Text style={styles.volumeSectionTitle}>Master</Text>
        <VolumeSlider
          label="Volume"
          value={masterVolume}
          onValueChange={updateMasterVolume}
          colors={colors}
        />
      </View>

      {/* Tanpura & Tabla volumes */}
      <View style={styles.volumeSection}>
        <VolumeSlider
          label="Tanpura"
          value={tanpuraVolume}
          onValueChange={updateTanpuraVolume}
          colors={colors}
        />
        <VolumeSlider
          label="Tabla"
          value={tablaVolume}
          onValueChange={updateTablaVolume}
          colors={colors}
        />
      </View>

      {/* String pattern display */}
      <View style={styles.patternContainer}>
        {config.pattern.map((note, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.stringButton,
              editingString === i && styles.stringButtonActive,
            ]}
            onPress={() => setEditingString(editingString === i ? null : i)}
          >
            <Text style={styles.stringLabel}>String {i + 1}</Text>
            <Text style={styles.stringNote}>{noteLabel(note)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Note editor for selected string */}
      {editingString !== null && (
        <View style={styles.editorContainer}>
          <Text style={styles.editorTitle}>
            Edit String {editingString + 1}
          </Text>

          <Text style={styles.editorLabel}>Swar</Text>
          <View style={styles.optionRow}>
            {SWAR_OPTIONS.map((swar) => (
              <TouchableOpacity
                key={swar}
                style={[
                  styles.optionButton,
                  config.pattern[editingString].swar === swar &&
                    styles.optionButtonActive,
                ]}
                onPress={() => updateStringNote(editingString, swar)}
              >
                <Text
                  style={[
                    styles.optionText,
                    config.pattern[editingString].swar === swar &&
                      styles.optionTextActive,
                  ]}
                >
                  {SWAR_LABELS[swar]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.editorLabel}>Saptak</Text>
          <View style={styles.optionRow}>
            {SAPTAK_OPTIONS.map((saptak) => (
              <TouchableOpacity
                key={saptak}
                style={[
                  styles.optionButton,
                  config.pattern[editingString].saptak === saptak &&
                    styles.optionButtonActive,
                ]}
                onPress={() => updateStringSaptak(editingString, saptak)}
              >
                <Text
                  style={[
                    styles.optionText,
                    config.pattern[editingString].saptak === saptak &&
                      styles.optionTextActive,
                  ]}
                >
                  {SAPTAK_LABELS[saptak]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Speed control */}
      <View style={styles.speedContainer}>
        <Text style={styles.speedLabel}>
          Speed: {config.speed.toFixed(1)}x
        </Text>
        <View style={styles.speedButtons}>
          <TouchableOpacity
            style={styles.speedButton}
            onPress={() => updateSpeed(-0.1)}
          >
            <Text style={styles.speedButtonText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.speedButton}
            onPress={() => updateSpeed(0.1)}
          >
            <Text style={styles.speedButtonText}>+</Text>
          </TouchableOpacity>
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
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.accent,
      textAlign: 'center',
      marginBottom: 24,
    },
    scaleSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
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
      fontSize: 18,
    },
    scaleCenter: {
      alignItems: 'center',
      marginHorizontal: 24,
    },
    scaleLabelSmall: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    scaleText: {
      color: colors.text,
      fontSize: 32,
      fontWeight: 'bold',
      minWidth: 50,
      textAlign: 'center',
    },
    volumeSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
    },
    volumeSectionTitle: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 10,
    },
    patternContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    stringButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 4,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    stringButtonActive: {
      borderColor: colors.accent,
    },
    stringLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    stringNote: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    editorContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    editorTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
      marginBottom: 12,
    },
    editorLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    optionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    optionButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.buttonBg,
    },
    optionButtonActive: {
      backgroundColor: colors.accent,
    },
    optionText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '500',
    },
    optionTextActive: {
      color: colors.background,
    },
    speedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    speedLabel: {
      fontSize: 16,
      color: colors.text,
    },
    speedButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    speedButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.buttonBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    speedButtonText: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
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
