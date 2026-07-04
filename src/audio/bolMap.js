/**
 * Maps every bol the app knows to the physical stroke samples that voice it.
 *
 * Each entry is a list of sub-strokes: { s: sampleKey, at: fraction }, where
 * `at` is the offset within the matra (0 = on the beat, 0.5 = halfway to the
 * next beat). Compound bols (Tete, Tirakita, ...) become multiple timed hits.
 *
 * FALLBACKS lets the engine substitute a close-sounding stroke when a sample
 * file is missing, so partial sample sets still play every taal.
 */

export const BOL_STROKES = {
  Dha: [{ s: 'dha', at: 0 }],
  Dhin: [{ s: 'dhin', at: 0 }],
  Dhi: [{ s: 'dhin', at: 0 }],
  Tin: [{ s: 'tin', at: 0 }],
  Ta: [{ s: 'ta', at: 0 }],
  Na: [{ s: 'na', at: 0 }],
  Tun: [{ s: 'tun', at: 0 }],
  Ge: [{ s: 'ge', at: 0 }],
  Ke: [{ s: 'ke', at: 0 }],
  Ti: [{ s: 'ti', at: 0 }],
  Te: [{ s: 'te', at: 0 }],
  Kat: [{ s: 'kat', at: 0 }],
  Tit: [{ s: 'ti', at: 0 }],
  Tete: [
    { s: 'te', at: 0 },
    { s: 'te', at: 0.5 },
  ],
  Tirakita: [
    { s: 'ti', at: 0 },
    { s: 'te', at: 0.25 },
    { s: 'ke', at: 0.5 },
    { s: 'ta', at: 0.75 },
  ],
  Gadi: [
    { s: 'ge', at: 0 },
    { s: 'ti', at: 0.5 },
  ],
  Kda: [
    { s: 'ke', at: 0 },
    { s: 'dha', at: 0.08 },
  ],
  Dhere: [
    { s: 'dha', at: 0 },
    { s: 'te', at: 0.5 },
  ],
  '-': [],
};

/** Substitution chain when a stroke sample is unavailable. */
export const FALLBACKS = {
  dhin: ['dha', 'tin'],
  dha: ['dhin', 'na'],
  tin: ['na', 'ta'],
  ta: ['na', 'tin'],
  na: ['ta', 'tin'],
  tun: ['tin', 'na'],
  ge: ['ke', 'dha'],
  ke: ['kat', 'ge'],
  kat: ['ke', 'ge'],
  ti: ['te', 'tin'],
  te: ['ti', 'tin'],
};

/**
 * Resolve a sample key against the set of actually-loaded samples,
 * walking the fallback chain. Returns null if nothing usable exists.
 */
export function resolveSample(key, available) {
  if (available.has(key)) return key;
  for (const alt of FALLBACKS[key] || []) {
    if (available.has(alt)) return alt;
  }
  return null;
}
