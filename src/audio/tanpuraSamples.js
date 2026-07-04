/**
 * Tanpura pluck samples — a matched 4-string set from one instrument/session.
 *
 * Source: "Tanpura note" recordings by luckylittleraven on freesound.org
 * (sounds 416605, 416597, 416598, 416606) — CC0 1.0, public domain.
 *
 * `semi` is each recording's pitch in semitones relative to madhya Sa when
 * the scale is set to SAMPLE_ROOT (measured: C#3, C#2, G#2, A#2). The engine
 * picks the nearest sample per string so pitch-shifting stays minimal.
 */
export const SAMPLE_ROOT = 'C#';

export const SAMPLE_SET = [
  { source: require('../../assets/samples/tanpura/sa.mp3'), semi: 0 },
  { source: require('../../assets/samples/tanpura/sa_low.mp3'), semi: -12 },
  { source: require('../../assets/samples/tanpura/pa.mp3'), semi: -5 },
  { source: require('../../assets/samples/tanpura/dha.mp3'), semi: -3 },
];
