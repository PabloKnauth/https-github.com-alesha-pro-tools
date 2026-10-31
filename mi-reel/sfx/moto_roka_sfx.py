"""Synthesized sound effects for the Moto Roka reel, synced to the widget/camera timeline.
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

SR, DUR = 48000, 27.95
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
# camera push-ins: soft whoosh-in
for at in (5.55, 12.6, 22.5, 26.85):
    place(whoosh(0.35, 400, 5000, 0.75), at, -22)

# 1.78 oil gauge
place(whoosh(), 1.65, -21, -0.3); place(pop(), 1.86, -17, -0.3)
place(beep(1050), 3.7, -24); place(beep(1050), 3.95, -24)            # nivel bajo

# 4.62 alert notification, 5.7 "falla"
place(whoosh(), 4.5, -21, 0.2); place(chime([880, 660]), 4.66, -18, 0.2)
place(impact(), 5.68, -15); place(glitch(), 5.7, -24)

# 8.82 / 9.92 / 11.0 problem chips (pan left, where they appear)
for at in (8.82, 9.92, 11.0):
    place(pop(1000, 320), at, -17, -0.5); place(error_bonk(), at + 0.07, -23, -0.5)

# 12.74 official badge, 15.1 QJ pill
place(whoosh(0.5), 12.6, -20); place(pop(700, 220, 0.12), 12.8, -17)
place(sparkle(), 15.1, -21, 0.15)

# 16.4 checklist + checks rising in pitch
place(whoosh(), 16.28, -21, -0.5)
for at, f in ((17.74, 1320), (19.28, 1480), (20.02, 1660), (20.46, 1980)):
    place(bell([(f, 1), (f * 2, 0.3)], 0.5, 0.09), at, -20, -0.4); place(tick(), at, -24, -0.4)

# 21.2 ready bar: riser into success chime on "rodar"
place(whoosh(), 21.08, -21); place(riser(), 21.4, -25); place(chime([784, 988, 1175, 1568], 0.07, 0.35), 22.66, -16)

# 23.42 chat: enter, typing, send, typing dots, reply
place(whoosh(0.45, 300, 4000), 23.3, -21, 0.3)
for k in range(8):
    place(key_click(), 23.6 + k * 0.075 + rng.uniform(-0.01, 0.01), -24, 0.3)
place(send_swoop(), 24.3, -19, 0.35)
place(chime([1046, 1318], 0.09, 0.22), 25.5, -17, 0.3)

# 26.38 CTA, 27.02 "dime"
place(whoosh(0.4), 26.26, -21); place(pop(820, 300, 0.1), 26.45, -16)
place(impact() * 0.5 + chime([1568], 0.1, 0.4), 27.0, -18)

bed = bed[: int(SR * DUR)]
print("sfx peak dBFS:", round(20 * np.log10(np.abs(bed).max()), 1))
wavfile.write(OUT, SR, (np.clip(bed, -1, 1) * 32767).astype(np.int16))
