"""Synthesized sound effects for the warehouse-for-rent reel (Moto Roka style), synced to the widget/camera timeline.
Writes a stereo 48 kHz SFX bed (WAV) the length of the video.

Usage (requires numpy and scipy):
    python3 moto_roka_sfx.py sfx.wav
    ffmpeg -i video.mp4 -i sfx.wav \
      -filter_complex "[0:a][1:a]amix=inputs=2:normalize=0:duration=first[a]" \
      -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -movflags +faststart video_sfx.mp4

`-c:v copy` keeps the picture bit-identical; only the audio gains the SFX layer.
For another video, edit DUR and the timeline section at the bottom."""
import sys, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR, DUR = 48000, 28.77
OUT = sys.argv[1]
rng = np.random.default_rng(7)
bed = np.zeros((int(SR * DUR) + SR, 2), np.float32)

def db(x): return 10 ** (x / 20)
def t_(d): return np.arange(int(SR * d)) / SR

def place(sig, at, gain_db, pan=0.0):
    """Mix a mono signal at `at` seconds, peak-normalized to gain_db dBFS, with constant-power pan."""
    sig = sig / (np.abs(sig).max() + 1e-9) * db(gain_db)
    i = int(at * SR)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bed[i:i + len(sig), 0] += sig * l * 1.414
    bed[i:i + len(sig), 1] += sig * r * 1.414

def env(n, a, d):
    """Attack/decay envelope (seconds)."""
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)

def bandnoise(d, lo, hi):
    sos = butter(4, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, rng.standard_normal(int(SR * d)))

def whoosh(d=0.45, lo=300, hi=4500, rise=0.6):
    n = int(SR * d)
    x = rng.standard_normal(n)
    # sweep a band-pass upward by processing in chunks
    out = np.zeros(n); chunk = 512
    for k in range(0, n, chunk):
        f = lo + (hi - lo) * (k / n) ** 0.8
        sos = butter(2, [max(80, f * 0.6), min(SR / 2 - 100, f * 1.6)], btype="band", fs=SR, output="sos")
        out[k:k + chunk] = sosfilt(sos, x[k:k + chunk])
    t = np.arange(n) / n
    e = np.where(t < rise, (t / rise) ** 2, ((1 - t) / (1 - rise)) ** 1.5)
    return out * e

def pop(f0=900, f1=280, d=0.09):
    t = t_(d)
    f = f1 + (f0 - f1) * np.exp(-t * 45)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.03)

def bell(freqs, d=0.8, decay=0.25):
    t = t_(d)
    s = sum(np.sin(2 * np.pi * f * t) * a for f, a in freqs)
    return s * env(len(t), 0.003, decay)

def chime(notes, gap=0.11, decay=0.3):
    total = np.zeros(int(SR * (gap * len(notes) + 0.9)))
    for k, f in enumerate(notes):
        b = bell([(f, 1), (f * 2, 0.35), (f * 3.01, 0.12)], 0.9, decay)
        i = int(k * gap * SR); total[i:i + len(b)] += b
    return total

def tick(f=2600, d=0.03):
    t = t_(d)
    return np.sin(2 * np.pi * f * t) * env(len(t), 0.0005, 0.008) + bandnoise(d, 3000, 9000) * env(len(t), 0.0003, 0.003) * 0.6

def key_click():
    d = 0.025
    return bandnoise(d, 1800, 7000) * env(int(SR * d), 0.0005, 0.004) + tick(rng.uniform(3800, 4600), d) * 0.3

def impact():
    t = t_(1.0)
    boom = np.sin(2 * np.pi * (48 + 60 * np.exp(-t * 18)) * t) * env(len(t), 0.002, 0.28)
    crack = bandnoise(1.0, 200, 3000) * env(len(t), 0.001, 0.05) * 0.8
    return boom + crack

def glitch(d=0.45):
    n = int(SR * d); out = np.zeros(n); k = 0
    while k < n:
        L = int(SR * rng.uniform(0.015, 0.05))
        f = rng.choice([180, 240, 420, 660, 90])
        seg = np.sign(np.sin(2 * np.pi * f * np.arange(L) / SR)) * (rng.random() > 0.25)
        out[k:k + L] = seg[: max(0, min(L, n - k))]
        k += L
    sos = butter(2, 3500, btype="low", fs=SR, output="sos")
    return sosfilt(sos, out) * np.linspace(1, 0.2, n)

def beep(f=1000, d=0.09):
    t = t_(d)
    return np.tanh(3 * np.sin(2 * np.pi * f * t)) * env(len(t), 0.002, 0.05)

def error_bonk():
    t = t_(0.22)
    return (np.sin(2 * np.pi * 220 * t) + 0.6 * np.sin(2 * np.pi * 233 * t)) * env(len(t), 0.003, 0.07)

def riser(d=1.25):
    t = t_(d)
    f = 260 * (4.5 ** (t / d))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5
    nz = bandnoise(d, 800, 8000) * 0.5
    return (tone + nz) * (t / d) ** 1.6 * (1 - np.exp(-(d - t) * 60))

def sparkle():
    out = np.zeros(int(SR * 0.9))
    for k, f in enumerate([2093, 2637, 3136, 4186]):
        b = bell([(f, 1), (f * 1.5, 0.2)], 0.6, 0.12)
        i = int(k * 0.05 * SR); out[i:i + len(b)] += b
    return out

def send_swoop():
    t = t_(0.22)
    f = 500 + 1400 * (t / 0.22) ** 1.2
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.01, 0.09) + whoosh(0.22, 1500, 6000, 0.4) * 0.5

# ---------------- timeline (s) ----------------
for at in (2.733, 8.333, 12.967, 19.8, 22.5):                     # existing cuts
    place(whoosh(0.3, 600, 6000, 0.7), at - 0.15, -25)
for at in (3.0, 8.5, 13.28, 16.48, 19.8, 21.6, 26.92):            # camera push-ins
    place(whoosh(0.35, 400, 5000, 0.75), at, -23)

# hook card + 3 slots
place(whoosh(), 0.64, -21); place(pop(), 0.84, -18)
for k, f in enumerate((900, 1100, 1350)):
    place(pop(f, f * 0.35), 1.84 + k * 0.12, -19)

# 01 acceso
place(whoosh(), 2.64, -21); place(impact() * 0.6, 3.12, -17)
place(tick(), 6.58, -22, -0.3); place(tick(2900), 6.96, -22, 0.3)
place(chime([1320, 1760], 0.08, 0.2), 7.58, -18)

# 02 seguridad: inventory bar rises, rent bar is small
place(whoosh(), 8.22, -21); place(impact() * 0.6, 8.62, -17)
place(riser(1.2), 10.15, -20); place(chime([988, 1318], 0.07, 0.25), 11.4, -19)
place(pop(500, 200, 0.12), 12.2, -20)

# 03 ubicación (big): route draws, pin drops
place(whoosh(0.5, 200, 4000, 0.6), 13.1, -19); place(impact() * 0.6, 13.38, -16)
place(riser(1.2), 13.65, -22); place(pop(1200, 400, 0.1), 14.9, -17)

# renta barata ≠ ahorro: strike, clock, money
place(whoosh(0.5, 200, 4000, 0.6), 15.0, -20)
place(error_bonk(), 16.6, -19)
for k in range(5):
    place(tick(1900), 17.98 + k * 0.22, -17)
place(pop(700, 180, 0.14), 18.62, -18); place(error_bonk(), 18.7, -22)

# ¿por qué te cuento esto?
place(pop(1000, 330), 19.92, -17)

# bodega en renta: card, grows when he leaves frame, three checks
place(whoosh(), 21.58, -21); place(impact() * 0.5, 21.72, -18)
place(whoosh(0.4, 300, 4000, 0.6), 22.4, -22)
for k, (at, f) in enumerate(((22.7, 1320), (22.98, 1480), (23.34, 1760))):
    place(bell([(f, 1), (f * 2, 0.3)], 0.5, 0.09), at, -18); place(tick(), at, -23)

# chat: typing, send, reply, CTA
place(whoosh(0.45, 300, 4000), 25.58, -21)
for k in range(12):
    place(key_click(), 25.62 + k * 0.058 + rng.uniform(-0.008, 0.008), -18)
place(send_swoop(), 26.42, -19)
place(chime([1046, 1318], 0.09, 0.22), 27.38, -17)
place(pop(820, 300, 0.1), 27.65, -17)

bed = bed[: int(SR * DUR)]
print("sfx peak dBFS:", round(20 * np.log10(np.abs(bed).max()), 1))
wavfile.write(OUT, SR, (np.clip(bed, -1, 1) * 32767).astype(np.int16))
