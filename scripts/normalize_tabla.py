#!/usr/bin/env python3
"""
Normalize tabla bol samples so every strike sits at the same small offset
from the start, tails are kept to their natural decay, levels are balanced,
and edges are click-free. Uses stdlib `wave` for I/O (no scipy dependency).

- Aligns the *attack foot* (start of the transient) to PRE_ROLL_MS in every file
  -> constant playback delay across bols -> even groove (inaudible constant lag).
- Trims trailing silence to natural decay + a fade-out tail (NOT a forced uniform
  length) so short damped bols don't hog polyphony voices at high tempo.
- Peak-normalizes every bol to the same target so they are balanced.
- Raised-cosine fade-in over the (near-silent) pre-roll and fade-out on the tail.
"""
import os, glob, sys, wave
import numpy as np

SRC = 'assets/samples/tabla'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/tabla_normalized'
os.makedirs(OUT, exist_ok=True)

PRE_ROLL_MS = 10.0        # lead before the strike, identical for every file
FADE_IN_MS = 5.0          # ramps up within the pre-roll, before the strike
FADE_OUT_MS = 20.0        # tail fade to avoid cut clicks
TARGET_PEAK_DB = -1.5     # uniform peak level
MAX_LEN_MS = 700.0        # safety cap on total length
ATTACK_FOOT_FRAC = 0.02   # foot of attack = 2% of peak
TAIL_FRAC = 0.005         # tail ends where env drops below 0.5% of peak ...
TAIL_FLOOR_FS = 0.003     # ... or 0.3% of full scale, whichever is higher
FS = 32768.0

def db_to_amp(db):
    return 10.0 ** (db / 20.0)

def read_wav(path):
    w = wave.open(path, 'rb')
    ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = w.readframes(n); w.close()
    assert sw == 2, f"{path}: expected 16-bit, got {sw*8}-bit"
    x = np.frombuffer(raw, dtype='<i2').astype(np.float64).reshape(-1, ch)
    return sr, ch, x

def write_wav(path, sr, ch, x_int16):
    w = wave.open(path, 'wb')
    w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(x_int16.reshape(-1).astype('<i2').tobytes()); w.close()

def strike_and_peakdb(x, sr):
    env = np.max(np.abs(x), axis=1)
    peak = env.max()
    return x.shape[0]/sr, int(np.argmax(env))/sr, 20*np.log10(max(peak,1)/FS)

print(f"{'file':9} | {'BEFORE dur':>10} {'strike@':>8} {'peak dB':>8} | "
      f"{'AFTER dur':>9} {'foot@':>7} {'peak dB':>8}")
print('-'*74)

for f in sorted(glob.glob(SRC + '/*.wav')):
    name = os.path.basename(f)
    sr, ch, x = read_wav(f)
    n = x.shape[0]
    env = np.max(np.abs(x), axis=1)
    peak = env.max()
    peakidx = int(np.argmax(env))

    # attack foot: walk back from the peak to the start of the rise
    foot_thr = ATTACK_FOOT_FRAC * peak
    i = peakidx
    while i > 0 and env[i] > foot_thr:
        i -= 1
    foot = i

    # tail end: last frame above the decay threshold
    tail_thr = max(TAIL_FRAC * peak, TAIL_FLOOR_FS * FS)
    above = np.where(env > tail_thr)[0]
    tail_end = int(above[-1]) if len(above) else n - 1

    pre = int(round(PRE_ROLL_MS / 1000 * sr))
    fo = int(round(FADE_OUT_MS / 1000 * sr))

    seg_start = max(0, foot - pre)
    lead_pad = pre - (foot - seg_start)          # pad if source lacks lead
    end = min(n, tail_end + fo + 1)
    seg = x[seg_start:end].copy()
    if lead_pad > 0:
        seg = np.vstack([np.zeros((lead_pad, ch)), seg])

    maxlen = int(round(MAX_LEN_MS / 1000 * sr))
    if seg.shape[0] > maxlen:
        seg = seg[:maxlen]

    L = seg.shape[0]
    fi = int(round(FADE_IN_MS / 1000 * sr))
    if 0 < fi < L:
        seg[:fi] *= (0.5*(1 - np.cos(np.linspace(0, np.pi, fi))))[:, None]
    if 0 < fo < L:
        seg[-fo:] *= (0.5*(1 + np.cos(np.linspace(0, np.pi, fo))))[:, None]

    cur_peak = np.max(np.abs(seg))
    if cur_peak > 0:
        seg *= (db_to_amp(TARGET_PEAK_DB) * FS) / cur_peak

    seg = np.clip(np.round(seg), -FS, FS - 1).astype(np.int16)
    outpath = os.path.join(OUT, name)
    write_wav(outpath, sr, ch, seg)

    b_dur, b_strike, b_db = n/sr, peakidx/sr, 20*np.log10(max(peak,1)/FS)
    _, _, a2 = read_wav(outpath)
    a_dur, a_foot, a_db = strike_and_peakdb(a2, sr)
    print(f"{name:9} | {b_dur*1000:8.0f}ms {b_strike*1000:6.0f}ms {b_db:7.1f}dB | "
          f"{a_dur*1000:7.0f}ms {a_foot*1000:5.0f}ms {a_db:7.1f}dB")

print(f"\nWrote normalized samples to: {OUT}")
