"""Original upbeat music bed + transition SFX for Vestidos Pinky ads (no third-party samples).

Usage: python3 pinky_music.py events.json out.wav
events.json: {"duration": 27.1, "whoosh": [t, ...], "pop": [t, ...], "cash": [t, ...], "hit": [t, ...],
              "type": [[t0, t1], ...], "music_db": -18, "sfx_db": -14}
Music: 124 BPM electro-pop loop (four-on-the-floor kick, claps on 2 & 4, off-beat hats, bass and
plucked chords over Am-F-C-G) with sidechain pumping, a short intro filter sweep and a final hit.
"""
import json, sys, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
SR = 48000
DUR = float(EV["duration"])
N = int(SR * (DUR + 0.6))
rng = np.random.default_rng(11)
BPM = 124.0
BEAT = 60.0 / BPM

def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)
def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)
def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)
def put(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf): return
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n] * gain

# ---------------- instruments ----------------
def kick():
    t = t_(0.32); f = 45 + 95 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.12) + bp(rng.standard_normal(len(t)), 1500, 5000) * env(len(t), 0.0005, 0.004) * 0.3
def clap():
    out = np.zeros(int(SR * 0.25))
    for k in range(3):
        n = int(SR * 0.12); b = bp(rng.standard_normal(n), 900, 3500) * env(n, 0.001, 0.03 if k < 2 else 0.07)
        put(out, b, k * 0.011, 0.8 if k < 2 else 1.0)
    return out
def hat(open_=False):
    d = 0.18 if open_ else 0.05; n = int(SR * d)
    return hp(rng.standard_normal(n), 7000, 4) * env(n, 0.0005, 0.05 if open_ else 0.012)
def saw(f, d):
    t = t_(d); return 2 * ((t * f) % 1) - 1
def pluck(freqs, d=0.22):
    s = sum(saw(f, d) + 0.5 * saw(f * 1.006, d) for f in freqs) / len(freqs)
    return lp(s, 2600) * env(len(s), 0.004, 0.09)
def bass_note(f, d):
    t = t_(d); s = np.sign(np.sin(2 * np.pi * f * t)) * 0.6 + np.sin(2 * np.pi * f * t)
    return lp(s, 420) * env(len(t), 0.005, d * 0.6)

NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
PROG = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]  # Am F C G (bass midi, chord)

drums = np.zeros(N); bass = np.zeros(N); keys = np.zeros(N); pump = np.ones(N)
nbeats = int(DUR / BEAT) + 2
for b in range(nbeats):
    t0 = b * BEAT
    put(drums, kick(), t0, 1.0)
    i = int(t0 * SR); n = int(0.22 * SR)                       # sidechain envelope after each kick
    pump[i:i + n] = np.minimum(pump[i:i + n], 0.35 + 0.65 * np.linspace(0, 1, len(pump[i:i + n])) ** 0.7)
    if b % 2 == 1: put(drums, clap(), t0, 0.55)
    put(drums, hat(open_=(b % 4 == 3)), t0 + BEAT / 2, 0.35)
    put(drums, hat(), t0 + BEAT / 4, 0.12); put(drums, hat(), t0 + 3 * BEAT / 4, 0.12)
    bar = (b // 4) % 4
    root, chord = PROG[bar]
    put(bass, bass_note(NOTE(root - 12), BEAT * 0.48), t0 + BEAT / 2, 0.55)
    put(bass, bass_note(NOTE(root - 12), BEAT * 0.3), t0, 0.35)
    put(keys, pluck([NOTE(m) for m in chord]), t0 + BEAT / 2, 0.42)
    if b % 4 == 3: put(keys, pluck([NOTE(m + 12) for m in chord[:2]], 0.18), t0 + 3 * BEAT / 4, 0.25)

music = drums * 0.9 + bass * pump + keys * pump
intro = int(SR * min(1.2, DUR / 4))                            # filter sweep in
music[:intro] = lp(music[:intro], 600) * np.linspace(0.4, 1, intro) + music[:intro] * np.linspace(0, 1, intro) ** 2
end = int(SR * DUR)                                            # stop on the last beat + final hit
music[end:] = 0
music[max(0, end - int(0.4 * SR)):end] *= np.linspace(1, 0.6, min(end, int(0.4 * SR)))
tail = kick()[: int(0.3 * SR)] + pluck([NOTE(m) for m in PROG[0][1]], 0.5)[: int(0.3 * SR)]
put(music, tail, max(0, DUR - 0.3), 0.9)
music = music / (np.sqrt((music[: end] ** 2).mean()) + 1e-9) * 10 ** (EV.get("music_db", -18) / 20)

# ---------------- transition SFX ----------------
def whoosh(d=0.38):
    n = int(SR * d); x = rng.standard_normal(n); out = np.zeros(n); ch = 512
    for k in range(0, n, ch):
        f = 400 + 6000 * (k / n) ** 0.8
        out[k:k + ch] = sosfilt(butter(2, [max(80, f * 0.6), min(SR / 2 - 200, f * 1.6)], btype="band", fs=SR, output="sos"), x[k:k + ch])
    tt = np.arange(n) / n
    return out * np.where(tt < 0.65, (tt / 0.65) ** 2, ((1 - tt) / 0.35) ** 1.5)
def pop(f0=1000, f1=320, d=0.09):
    t = t_(d); f = f1 + (f0 - f1) * np.exp(-t * 45)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.03)
def chime(notes, gap=0.07, dec=0.3):
    out = np.zeros(int(SR * (gap * len(notes) + 0.9)))
    for k, f in enumerate(notes):
        t = t_(0.9); put(out, (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * env(len(t), 0.003, dec), k * gap)
    return out
def cash():
    out = np.zeros(int(SR * 1.0)); n = int(SR * 0.05)
    put(out, bp(rng.standard_normal(n), 2500, 9000) * env(n, 0.0005, 0.01), 0, 0.8)
    put(out, chime([1568, 2093], 0.06, 0.28), 0.03)
    return out
def hit():
    t = t_(0.6); return np.sin(2 * np.pi * (48 + 70 * np.exp(-t * 20)) * t) * env(len(t), 0.002, 0.18) + bp(rng.standard_normal(len(t)), 200, 3000) * env(len(t), 0.001, 0.04)
def key():
    n = int(SR * 0.025); return bp(rng.standard_normal(n), 1800, 7000) * env(n, 0.0005, 0.004)

sfx = np.zeros(N)
def norm(s, dbv): return s / (np.abs(s).max() + 1e-9) * 10 ** (dbv / 20)
base = EV.get("sfx_db", -14)
for t in EV.get("whoosh", []): put(sfx, norm(whoosh(), base - 4), max(0, t - 0.28))
for t in EV.get("pop", []): put(sfx, norm(pop(), base), t)
for t in EV.get("cash", []): put(sfx, norm(cash(), base + 1), t)
for t in EV.get("hit", []): put(sfx, norm(hit(), base + 1), t)
for a, b in EV.get("type", []):
    k = a
    while k < b: put(sfx, norm(key(), base - 3), k + rng.uniform(-0.008, 0.008)); k += 0.06

mix = music + sfx
mix = mix[: int(SR * DUR)]
print(f"music RMS {20*np.log10(np.sqrt((music[:end]**2).mean())):.1f} dBFS, peak {20*np.log10(np.abs(mix).max()+1e-9):.1f} dBFS")
wavfile.write(OUT, SR, np.stack([mix, mix], 1).astype(np.float32))
