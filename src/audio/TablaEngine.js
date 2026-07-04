import { createAudioPlayer } from 'expo-audio';
import { BOL_STROKES, resolveSample } from './bolMap';

const POOL_SIZE = 2; // players per stroke so fast re-triggers don't cut off

/**
 * TablaEngine sequences tabla bol samples according to a taal's theka.
 *
 * Uses expo-audio (the modern replacement for expo-av).
 * Pre-loads a small pool of AudioPlayers per stroke sample and resolves
 * bols through the bol map, so compound bols (Tete, Tirakita) play as
 * multiple sub-hits inside one matra.
 * Timing is drift-corrected: each tick is scheduled against an absolute
 * beat clock rather than chained raw setTimeout delays.
 * Supports mid-cycle taal switching (partaal) on the next sam.
 */
export class TablaEngine {
  pools = new Map(); // sampleKey -> { players: [], next: 0 }
  config;
  strokeSamples;
  volume = 1.0;

  isPlaying = false;
  currentMatra = 0;
  timerId = null;
  subTimers = new Set();
  nextTickAt = 0;

  queuedTaal = null;

  onMatra;
  onSam;
  onCycleComplete;

  constructor(strokeSamples, config) {
    this.strokeSamples = strokeSamples;
    this.config = config;
  }

  async load() {
    await this.unloadSounds();

    for (const [key, source] of Object.entries(this.strokeSamples)) {
      if (!source) continue;
      const players = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const player = createAudioPlayer(source);
        player.volume = this.volume;
        players.push(player);
      }
      this.pools.set(key, { players, next: 0 });
    }
  }

  async start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentMatra = 0;
    this.nextTickAt = Date.now();
    this.onSam?.();
    this.tick();
  }

  async stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    for (const t of this.subTimers) clearTimeout(t);
    this.subTimers.clear();
  }

  queueTaalChange(taal) {
    this.queuedTaal = taal;
  }

  updateConfig(config) {
    this.config = { ...this.config, ...config };
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
    for (const pool of this.pools.values()) {
      for (const player of pool.players) {
        player.volume = vol;
      }
    }
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

  tick() {
    if (!this.isPlaying) return;

    const { taal, bpm } = this.config;
    const matra = taal.theka[this.currentMatra];
    const msPerBeat = (60 / bpm) * 1000;

    if (this.currentMatra === 0) {
      this.onSam?.();
    }
    this.onMatra?.(this.currentMatra, matra);

    this.playMatra(matra, msPerBeat);

    this.currentMatra++;

    if (this.currentMatra >= taal.matras) {
      this.onCycleComplete?.();
      this.currentMatra = 0;

      if (this.queuedTaal) {
        this.config.taal = this.queuedTaal;
        this.queuedTaal = null;
      }
    }

    this.nextTickAt += msPerBeat;
    const delay = Math.max(0, this.nextTickAt - Date.now());
    this.timerId = setTimeout(() => this.tick(), delay);
  }

  playMatra(matra, msPerBeat) {
    if (!matra) return;
    for (const bol of matra.bols) {
      const strokes = BOL_STROKES[bol];
      if (!strokes) continue;

      for (const stroke of strokes) {
        if (stroke.at === 0) {
          this.triggerStroke(stroke.s);
        } else {
          const t = setTimeout(() => {
            this.subTimers.delete(t);
            if (this.isPlaying) this.triggerStroke(stroke.s);
          }, stroke.at * msPerBeat);
          this.subTimers.add(t);
        }
      }
    }
  }

  triggerStroke(sampleKey) {
    const key = resolveSample(sampleKey, this.pools);
    if (!key) return;

    const pool = this.pools.get(key);
    const player = pool.players[pool.next];
    pool.next = (pool.next + 1) % pool.players.length;

    player.seekTo(0);
    player.play();
  }

  async unloadSounds() {
    for (const pool of this.pools.values()) {
      for (const player of pool.players) {
        player.release();
      }
    }
    this.pools.clear();
  }

  async dispose() {
    await this.stop();
    await this.unloadSounds();
  }
}
