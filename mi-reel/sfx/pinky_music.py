"""SFX track (and optional original music bed) for Vestidos Pinky ads.

Usage: python3 pinky_music.py events.json out.wav
events.json: {"duration": 27.1, "whoosh": [t, ...], "riser": [t, ...], "pop": [t, ...], "cash": [t, ...],
              "hit": [t, ...], "sparkle": [t, ...], "type": [[t0, t1], ...], "music": false, "music_db": -43,
              "sfx_db": -20}
SFX come from pinky_lib/ (index.json): whooshes, risers, sparkle and typing extracted from the client's
reference ads, plus pop / ka-ching / ding from myinstants.com. Whooshes are aligned on their loudest point
to the cut; risers end on the cut. The client asked for no music (2026-11), so music is off by default.
Music (only with "music": true): 124 BPM electro-pop loop (four-on-the-floor kick, claps on 2 & 4, off-beat hats, bass and
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
for b in range(nbeats if EV.get("music", False) else 0):
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
if EV.get("music", False): put(music, tail, max(0, DUR - 0.3), 0.9)
music = music * 0 if not EV.get("music", False) else music / (np.sqrt((music[: end] ** 2).mean()) + 1e-9) * 10 ** (EV.get("music_db", -18) / 20)

# ---------------- SFX from the sample library ----------------
import os
LIB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pinky_lib")
META = json.load(open(os.path.join(LIB, "index.json")))
def smp(name):
    return wavfile.read(os.path.join(LIB, name + ".wav"))[1].astype(float)
sfx = np.zeros(N)
base = EV.get("sfx_db", -20)
def place(name, t, db_rel=0.0, align="start"):
    y = smp(name) * 10 ** ((base + db_rel) / 20)          # samples are peak-normalised to -1 dBFS
    m = META[name]
    at = t - (m["peak_at"] if align == "peak" else m["dur"] if align == "end" else 0.0)
    if at < 0: y = y[int(-at * SR):]; at = 0.0
    put(sfx, y, at)
WH = ["ref_whoosh1", "ref_whoosh2", "ref_whoosh3", "ref_whoosh4", "mi_whoosh"]
for k, t in enumerate(EV.get("whoosh", [])): place(WH[k % len(WH)], t, -2, "peak")
for k, t in enumerate(EV.get("riser", [])): place(["ref_riser", "ref_riser2"][k % 2], t + 0.05, -1, "end")
for t in EV.get("sparkle", []): place("ref_sparkle", t, -4, "peak")
for t in EV.get("pop", []): place("mi_pop", t, -3)
for t in EV.get("cash", []): place("mi_cash", t, 0)
for t in EV.get("hit", []): place("mi_ding", t, -3)
typ = smp("mi_typing")
for a, b in EV.get("type", []):
    n = min(len(typ), int((b - a) * SR)); y = typ[:n].copy(); f = int(0.05 * SR); y[-f:] *= np.linspace(1, 0, f)
    put(sfx, y * 10 ** ((base + 4) / 20), a)

mix = music + sfx
mix = mix[: int(SR * DUR)]
print(f"music {'on' if EV.get('music', False) else 'off'}, SFX peak {20*np.log10(np.abs(sfx).max()+1e-9):.1f} dBFS")
wavfile.write(OUT, SR, np.stack([mix, mix], 1).astype(np.float32))
