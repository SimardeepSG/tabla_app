#!/usr/bin/env python3
"""
Bake a convolution reverb tail into the tabla and tanpura samples so their
sound sustains into the gaps at slow speeds (expo-audio has no runtime reverb).

The reverb is a synthetic impulse response: exponentially-decaying, lightly
low-passed (darker) stereo noise with a short pre-delay. Each sample is
convolved with it and mixed under the dry signal, then peak-normalized.

- tabla RESONANT strokes (dha/dhin/tin/na/ge/tun): a ~1s tail so the ring
  carries into slow-tempo gaps.
- tabla DAMPED strokes (ta/te/ke/kat/ti): only a whisper of room, stay crisp.
- tanpura plucks: a fuller tail to thicken the drone and blur the plucks.

Self-adjusting by design: at slow speeds the tail fills the gap; at fast
speeds the tails overlap into a fuller sound. Reads WAV directly and MP3 via
ffmpeg. Run AFTER normalize_tabla.py (it extends the tail; don't re-trim).

Usage: python3 scripts/add_reverb.py           # process in place (backs up)
"""
import os, glob, sys, wave, subprocess, tempfile
import numpy as np

FS = 32768.0
TARGET_PEAK_DB = -1.5

RESONANT = {'dha', 'dhin', 'tin', 'na', 'ge', 'tun'}

PARAMS = {
    'resonant': dict(rt60=1.00, predelay_ms=18, wet=0.30, damp=0.50, seed=101),
    'damped':   dict(rt60=0.40, predelay_ms=12, wet=0.12, damp=0.55, seed=202),
    'tanpura':  dict(rt60=1.30, predelay_ms=25, wet=0.30, damp=0.50, seed=303),
}

def onepole_lp(x, a):
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = a * acc + (1 - a) * x[i]
        y[i] = acc
    return y

def make_ir(sr, p):
    n = int(p['rt60'] * sr)
    t = np.arange(n) / sr
    env = np.exp(-6.908 * t / p['rt60'])          # -60 dB at rt60
    pre = int(p['predelay_ms'] / 1000 * sr)
    irs = []
    for c in range(2):
        rng = np.random.default_rng(p['seed'] + c)
        ir = onepole_lp(rng.standard_normal(n), p['damp']) * env
        irs.append(np.concatenate([np.zeros(pre), ir]))
    return irs

def fftconv(x, h):
    n = len(x) + len(h) - 1
    N = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(h, N), N)[:n]

def process(dry, sr, p):
    dry_peak = np.max(np.abs(dry)) or 1.0
    irs = make_ir(sr, p)
    wetlen = dry.shape[0] + len(irs[0]) - 1
    out = np.zeros((wetlen, 2))
    out[:dry.shape[0], :] += dry
    wet = np.zeros((wetlen, 2))
    for c in range(2):
        wc = fftconv(dry[:, c], irs[c])
        wet[:len(wc), c] = wc
    wp = np.max(np.abs(wet)) or 1.0
    wet *= (p['wet'] * dry_peak) / wp
    out += wet
    fo = int(0.06 * sr)
    if fo < out.shape[0]:
        out[-fo:, :] *= (0.5 * (1 + np.cos(np.linspace(0, np.pi, fo))))[:, None]
    peak = np.max(np.abs(out)) or 1.0
    out *= (10 ** (TARGET_PEAK_DB / 20) * FS) / peak
    return np.clip(np.round(out), -FS, FS - 1).astype(np.int16)

def read_wav(path):
    w = wave.open(path, 'rb')
    ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = w.readframes(n); w.close()
    x = np.frombuffer(raw, dtype='<i2').astype(np.float64).reshape(-1, ch)
    if ch == 1:
        x = np.repeat(x, 2, axis=1)
    return sr, x

def write_wav(path, sr, x_int16):
    w = wave.open(path, 'wb')
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(x_int16.reshape(-1).astype('<i2').tobytes()); w.close()

def read_via_ffmpeg(path):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
        tmp = tf.name
    subprocess.run(['ffmpeg', '-y', '-i', path, '-ar', '44100', '-ac', '2',
                    '-c:a', 'pcm_s16le', tmp], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    sr, x = read_wav(tmp); os.remove(tmp)
    return sr, x

def write_mp3_via_ffmpeg(path, sr, x_int16):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
        tmp = tf.name
    write_wav(tmp, sr, x_int16)
    subprocess.run(['ffmpeg', '-y', '-i', tmp, '-b:a', '192k', path], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)

def dur(x, sr):
    return x.shape[0] / sr

print(f"{'file':14} {'cat':9} {'before':>8} {'after':>8}")
print('-' * 44)

for f in sorted(glob.glob('assets/samples/tabla/*.wav')):
    name = os.path.splitext(os.path.basename(f))[0]
    cat = 'resonant' if name in RESONANT else 'damped'
    sr, dry = read_wav(f)
    out = process(dry, sr, PARAMS[cat])
    write_wav(f, sr, out)
    print(f"{name+'.wav':14} {cat:9} {dur(dry,sr)*1000:6.0f}ms {out.shape[0]/sr*1000:6.0f}ms")

for f in sorted(glob.glob('assets/samples/tanpura/*.mp3')):
    name = os.path.basename(f)
    sr, dry = read_via_ffmpeg(f)
    out = process(dry, sr, PARAMS['tanpura'])
    write_mp3_via_ffmpeg(f, sr, out)
    print(f"{name:14} {'tanpura':9} {dur(dry,sr)*1000:6.0f}ms {out.shape[0]/sr*1000:6.0f}ms")

print('\nDone.')
