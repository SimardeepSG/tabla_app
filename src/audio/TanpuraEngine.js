import { createAudioPlayer } from 'expo-audio';

const SEMITONE_MAP = {
  Sa: 0,
  Re_komal: 1,
  Re: 2,
  Ga_komal: 3,
  Ga: 4,
  Ma: 5,
  Ma_tivra: 6,
  Pa: 7,
  Dha_komal: 8,
  Dha: 9,
  Ni_komal: 10,
  Ni: 11,
};

const SAPTAK_OFFSET = {
  mandra: -12,
  madhya: 0,
  taar: 12,
};

/**
 * Calculate the playback rate to pitch-shift from Sa_madhya to a target note.
 * rate = 2^(semitones/12)
 */
function pitchRate(note) {
  const semitones = SEMITONE_MAP[note.swar] + SAPTAK_OFFSET[note.saptak];
  return Math.pow(2, semitones / 12);
}

/**
 * TanpuraEngine handles loading and looping tanpura string sounds.
 *
 * Uses expo-audio (the modern replacement for expo-av).
 * For each of the 4 strings, we create an AudioPlayer with adjusted playback rate.
 * Strings are played in sequence with a configurable delay between plucks.
 */
export class TanpuraEngine {
  players = [null, null, null, null];
  isPlaying = false;
  currentStringIndex = 0;
  timerId = null;
  config;
  baseSample;

  constructor(baseSample, config) {
    this.baseSample = baseSample;
    this.config = config;
  }

  async load() {
    await this.unloadSounds();

    for (let i = 0; i < 4; i++) {
      const player = createAudioPlayer(this.baseSample);
      player.volume = 1.0;
      player.rate = pitchRate(this.config.pattern[i]);
      this.players[i] = player;
    }
  }

  async start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStringIndex = 0;
    this.playNextString();
  }

  async stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    for (const player of this.players) {
      if (player) {
        player.pause();
      }
    }
  }

  async updateConfig(config) {
    const wasPlaying = this.isPlaying;
    await this.stop();
    this.config = { ...this.config, ...config };
    await this.load();
    if (wasPlaying) {
      await this.start();
    }
  }

  setVolume(vol) {
    for (const player of this.players) {
      if (player) {
        player.volume = vol;
      }
    }
  }

  getConfig() {
    return { ...this.config };
  }

  playNextString() {
    if (!this.isPlaying) return;

    const player = this.players[this.currentStringIndex];
    if (player) {
      player.seekTo(0);
      player.play();
    }

    this.onString?.(this.currentStringIndex);

    this.currentStringIndex = (this.currentStringIndex + 1) % 4;

    const delayMs = 1200 / this.config.speed;
    this.timerId = setTimeout(() => {
      this.playNextString();
    }, delayMs);
  }

  async unloadSounds() {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i]) {
        this.players[i].release();
        this.players[i] = null;
      }
    }
  }

  async dispose() {
    await this.stop();
    await this.unloadSounds();
  }
}
