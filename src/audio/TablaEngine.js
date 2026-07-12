import { AudioContext } from 'react-native-audio-api';
import { BOL_STROKES, resolveSample } from './bolMap';

// The look-ahead scheduler wakes every LOOKAHEAD_MS on the JS thread and queues
// every beat that comes due within the next SCHEDULE_AHEAD_S. Because each beat
// is placed onto the audio hardware clock *before* it is due, JS-thread jitter
// smaller than SCHEDULE_AHEAD_S no longer affects when a bol actually sounds.
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

/**
 * TablaEngine sequences tabla bol samples according to a taal's theka.
 *
 * Uses react-native-audio-api (the Web Audio API for React Native) for
 * sample-accurate playback. Every sample is decoded once into an in-memory
 * AudioBuffer; each hit is a fresh fire-and-forget AudioBufferSourceNode
 * scheduled with source.start(when) against the audio hardware clock
 * (ctx.currentTime). That removes the three sources of timing jitter the old
 * expo-audio/AVPlayer path had:
 *   - no cold-start latency (buffers are pre-decoded and resident),
 *   - no seekTo(0) rewind (each hit is a new source, so there is nothing to
 *     rewind and no per-trigger seek latency),
 *   - no JS-timer onset (the beat's time is a hardware-clock timestamp placed
 *     ahead of when it is due, so JS jitter within SCHEDULE_AHEAD_S is absorbed).
 * Overlapping voices sum naturally, so a slow-tempo Dha/Dhin reverb tail rings
 * through the next hits with no voice pool to exhaust.
 *
 * Timing follows the classic look-ahead scheduler ("A Tale of Two Clocks"):
 * a coarse JS timer queues every beat whose time falls within the next
 * SCHEDULE_AHEAD_S window against the absolute audio clock, so the grid never
 * drifts. Supports mid-cycle taal switching (partaal) on the next sam and
 * beat-quantized tempo changes.
 */
export class TablaEngine {
  ctx = null;
  masterGain = null;
  buffers = new Map(); // sampleKey -> AudioBuffer

  config;
  strokeSamples;
  volume = 1.0;

  isPlaying = false;
  currentMatra = 0;
  nextNoteTime = 0; // ctx.currentTime (s) at which the next beat should sound
  schedulerId = null;
  uiTimers = new Set();

  queuedTaal = null;
  pendingBpm = null; // tempo change queued to take effect on the next beat

  onMatra;
  onSam;
  onCycleComplete;

  constructor(strokeSamples, config) {
    this.strokeSamples = strokeSamples;
    this.config = config;
  }

  async load() {
    await this.unloadSounds();

    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }

    // Decode each sample once into an in-memory buffer. Passing the require()'d
    // module directly is supported: the native decoder reads the raw bytes and
    // sniffs the format, so the extension-less Metro dev URL is a non-issue.
    for (const [key, source] of Object.entries(this.strokeSamples)) {
      if (!source) continue;
      try {
        const buffer = await this.ctx.decodeAudioData(source);
        this.buffers.set(key, buffer);
      } catch (e) {
        // Skip a sample that fails to decode — resolveSample() falls back to a
        // close-sounding stroke, so the taal still plays.
      }
    }
  }

  async start() {
    if (this.isPlaying) return;
    // The context can start suspended; resume it before the first beat.
    if (this.ctx && this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch (e) {}
    }
    this.isPlaying = true;
    this.currentMatra = 0;
    this.pendingBpm = null;
    // A little headroom so the very first beat is scheduled slightly ahead of
    // the clock rather than exactly on it.
    this.nextNoteTime = this.ctx.currentTime + 0.06;
    this.scheduler();
  }

  async stop() {
    this.isPlaying = false;
    if (this.schedulerId) {
      clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
    for (const t of this.uiTimers) clearTimeout(t);
    this.uiTimers.clear();
  }

  queueTaalChange(taal) {
    this.queuedTaal = taal;
  }

  updateConfig(config) {
    const { bpm, ...rest } = config;
    this.config = { ...this.config, ...rest };
    if (bpm != null) {
      // Quantize tempo changes to the beat: while playing, defer the new bpm to
      // the next scheduled beat so the beat currently sounding keeps its tempo
      // and the change takes effect cleanly on the next beat. When stopped,
      // apply it immediately.
      if (this.isPlaying) {
        this.pendingBpm = bpm;
      } else {
        this.config.bpm = bpm;
      }
    }
  }

  async setTaal(taal) {
    const wasPlaying = this.isPlaying;
    await this.stop();
    this.config.taal = taal;
    this.currentMatra = 0;
    if (wasPlaying) {
      await this.start();
    }
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.masterGain) this.masterGain.gain.value = vol;
  }

  getConfig() {
    return { ...this.config };
  }

  getCurrentMatra() {
    return this.currentMatra;
  }

  isCurrentlyPlaying() {
    return this.isPlaying;
  }

  // Look-ahead scheduler: queue every beat that comes due within the next
  // SCHEDULE_AHEAD_S window, then sleep a short interval and repeat.
  scheduler() {
    if (!this.isPlaying || !this.ctx) return;

    const now = this.ctx.currentTime;
    // If the JS thread stalled and we fell behind the audio clock, re-anchor to
    // now instead of firing a burst of bunched-up catch-up beats (that burst is
    // the audible "stops then speeds up" glitch).
    if (this.nextNoteTime < now) {
      this.nextNoteTime = now;
    }

    while (this.nextNoteTime < now + SCHEDULE_AHEAD_S) {
      // Apply a queued tempo change on the beat boundary so the beat that just
      // sounded kept its tempo and the new tempo governs from here forward.
      if (this.pendingBpm != null) {
        this.config.bpm = this.pendingBpm;
        this.pendingBpm = null;
      }

      const { taal, bpm } = this.config;
      const matra = taal.theka[this.currentMatra];
      const secPerBeat = 60 / bpm;
      const when = this.nextNoteTime;
      const isSam = this.currentMatra === 0;

      this.scheduleMatra(matra, secPerBeat, when);
      this.scheduleUi(when, this.currentMatra, matra, isSam);

      this.currentMatra++;
      this.nextNoteTime += secPerBeat;

      if (this.currentMatra >= taal.matras) {
        this.onCycleComplete?.();
        this.currentMatra = 0;
        if (this.queuedTaal) {
          this.config.taal = this.queuedTaal;
          this.queuedTaal = null;
        }
      }
    }

    this.schedulerId = setTimeout(() => this.scheduler(), LOOKAHEAD_MS);
  }

  scheduleMatra(matra, secPerBeat, when) {
    if (!matra) return;
    for (const bol of matra.bols) {
      const strokes = BOL_STROKES[bol];
      if (!strokes) continue;
      // Sub-hits of a compound bol (Tete, Tirakita, ...) land at exact
      // fractional offsets on the audio clock — no setTimeout smear.
      for (const stroke of strokes) {
        this.triggerStroke(stroke.s, when + stroke.at * secPerBeat);
      }
    }
  }

  triggerStroke(sampleKey, when) {
    const key = resolveSample(sampleKey, this.buffers);
    if (!key) return;
    const buffer = this.buffers.get(key);
    if (!buffer) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.masterGain);
    src.start(when);
  }

  // Fire the visual matra/sam callbacks at the moment the beat actually sounds,
  // by converting the scheduled audio time into a delay from now. Keeps the
  // grid highlight in step with the audio even though the audio is queued ahead.
  scheduleUi(when, matraIndex, matra, isSam) {
    const delayMs = Math.max(0, (when - this.ctx.currentTime) * 1000);
    const t = setTimeout(() => {
      this.uiTimers.delete(t);
      if (!this.isPlaying) return;
      if (isSam) this.onSam?.();
      this.onMatra?.(matraIndex, matra);
    }, delayMs);
    this.uiTimers.add(t);
  }

  async unloadSounds() {
    this.buffers.clear();
  }

  async dispose() {
    await this.stop();
    await this.unloadSounds();
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch (e) {}
      this.ctx = null;
      this.masterGain = null;
    }
  }
}
