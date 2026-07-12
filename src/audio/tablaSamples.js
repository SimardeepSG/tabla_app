/**
 * Tabla stroke samples, keyed by the sample names used in bolMap.js.
 *
 * Source: "Tabla strokes dataset" by Subodh Deolekar (2020),
 * https://doi.org/10.5281/zenodo.4327350 — CC BY 4.0. Tabla tuned to C#.
 * Takes were selected per class for the cleanest, loudest un-clipped hit.
 *
 * Normalized (scripts/normalize_tabla.py) so every strike lands at the same
 * ~10ms offset from the start — a constant, inaudible delay that keeps the
 * groove even at high tempo instead of each bol lagging by a different amount.
 * Levels are matched (-1.5 dBFS peak), natural tails kept, edges faded to
 * avoid clicks. The engine plays from t=0 on the beat, so equal onset offsets
 * are what make the rhythm tight.
 */
export const STROKE_SAMPLES = {
  dha: require('../../assets/samples/tabla/dha.wav'),
  dhin: require('../../assets/samples/tabla/dhin.wav'),
  tin: require('../../assets/samples/tabla/tin.wav'),
  ta: require('../../assets/samples/tabla/ta.wav'),
  na: require('../../assets/samples/tabla/na.wav'),
  ge: require('../../assets/samples/tabla/ge.wav'),
  ke: require('../../assets/samples/tabla/ke.wav'),
  kat: require('../../assets/samples/tabla/kat.wav'),
  ti: require('../../assets/samples/tabla/ti.wav'),
  te: require('../../assets/samples/tabla/te.wav'),
  tun: require('../../assets/samples/tabla/tun.wav'),
};
