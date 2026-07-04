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
 * Target pitch of a string in semitones relative to madhya Sa at the
 * sample root scale. scaleOffset is the semitone distance from the sample
 * root to the user's selected Sa.
 */
function targetSemi(note, scaleOffset = 0) {
  return SEMITONE_MAP[note.swar] + SAPTAK_OFFSET[note.saptak] + scaleOffset;
}

/**
 * TanpuraEngine loads and loops tanpura string plucks.
 *
 * It is given a set of recordings of the same instrument at different
 * pitches ({ source, semi }). For each of the 4 strings it picks the
 * recording closest to the target note and pitch-shifts the remainder via
 * playback rate, so artifacts from large shifts are avoided. Strings are
 * plucked in sequence with a configurable interval.
 */
export class TanpuraEngine {
  players = [null, null, null, null];
  playerSemi = [null, null, null, null]; // semi of the sample loaded in each slot
  isPlaying = false;
  currentStringIndex = 0;
  timerId = null;
  config;
  sampleSet;
  volume = 1.0;

  constructor(sampleSet, config) {
    // Accept a single source for backwards compatibility
    this.sampleSet = Array.isArray(sampleSet)
      ? sampleSet
      : [{ source: sampleSet, semi: 0 }];
    this.config = config;
  }

  nearestSample(target) {
    let best = this.sampleSet[0];
    for (const s of this.sampleSet) {
      if (Math.abs(target - s.semi) < Math.abs(target - best.semi)) best = s;
    }
    return best;
  }

  async load() {
    await this.unloadSounds();
    for (let i = 0; i < 4; i++) {
      this.setupString(i);
    }
  }

  setupString(i) {
    const target = targetSemi(this.config.pattern[i], this.config.scaleOffset);
    const sample = this.nearestSample(target);

    // playbackRate is capped at 2.0 on mobile; fold anything beyond it
    // down an octave so the note stays correct, just an octave lower.
    let rate = Math.pow(2, (target - sample.semi) / 12);
    while (rate > 2.0) rate /= 2;
    while (rate < 0.25) rate *= 2;

    if (this.players[i] && this.playerSemi[i] === sample.semi) {
      // Same recording — just retune
      this.players[i].shouldCorrectPitch = false;
      this.players[i].playbackRate = rate;
      return;
    }

    if (this.players[i]) {
      this.players[i].release();
    }
    const player = createAudioPlayer(sample.source);
    player.volume = this.volume;
    player.shouldCorrectPitch = false;
    player.playbackRate = rate;
    this.players[i] = player;
    this.playerSemi[i] = sample.semi;
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
    this.config = { ...this.config, ...config };

    const pitchChanged =
      config.pattern !== undefined || config.scaleOffset !== undefined;
    if (!pitchChanged) return; // speed changes take effect on the next pluck

    if (this.players[0]) {
      for (let i = 0; i < 4; i++) {
        this.setupString(i);
      }
    }
  }

  setVolume(vol) {
    this.volume = vol;
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
        this.playerSemi[i] = null;
      }
    }
  }

  async dispose() {
    await this.stop();
    await this.unloadSounds();
  }
}
