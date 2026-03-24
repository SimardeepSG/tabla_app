import { createAudioPlayer } from 'expo-audio';

/**
 * TablaEngine sequences tabla bol samples according to a taal's theka.
 *
 * Uses expo-audio (the modern replacement for expo-av).
 * Pre-loads all bol samples as AudioPlayer instances.
 * Supports mid-cycle taal switching (partaal) on the next sam.
 */
export class TablaEngine {
  bolPlayers = new Map();
  config;
  bolSamples;

  isPlaying = false;
  currentMatra = 0;
  timerId = null;

  queuedTaal = null;

  onMatra;
  onSam;
  onCycleComplete;

  constructor(bolSamples, config) {
    this.bolSamples = bolSamples;
    this.config = config;
  }

  async load() {
    await this.unloadSounds();

    for (const [bol, source] of Object.entries(this.bolSamples)) {
      if (source) {
        const player = createAudioPlayer(source);
        player.volume = 1.0;
        this.bolPlayers.set(bol, player);
      }
    }
  }

  async start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentMatra = 0;
    this.onSam?.();
    this.tick();
  }

  async stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
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
    for (const player of this.bolPlayers.values()) {
      player.volume = vol;
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

    if (this.currentMatra === 0) {
      this.onSam?.();
    }
    this.onMatra?.(this.currentMatra, matra);

    this.playMatra(matra);

    this.currentMatra++;

    if (this.currentMatra >= taal.matras) {
      this.onCycleComplete?.();
      this.currentMatra = 0;

      if (this.queuedTaal) {
        this.config.taal = this.queuedTaal;
        this.queuedTaal = null;
      }
    }

    const msPerBeat = (60 / bpm) * 1000;
    this.timerId = setTimeout(() => this.tick(), msPerBeat);
  }

  playMatra(matra) {
    for (const bol of matra.bols) {
      if (bol === '-') continue;

      const player = this.bolPlayers.get(bol);
      if (player) {
        player.seekTo(0);
        player.play();
      }
    }
  }

  async unloadSounds() {
    for (const player of this.bolPlayers.values()) {
      player.release();
    }
    this.bolPlayers.clear();
  }

  async dispose() {
    await this.stop();
    await this.unloadSounds();
  }
}
