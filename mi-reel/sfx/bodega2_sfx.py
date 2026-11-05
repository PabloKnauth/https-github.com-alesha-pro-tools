"""Synthesized sound effects for the "¿te queda chico?" warehouse reel: Moto Roka palette plus comic SFX for the running gag.
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

SR, DUR = 48000, 43.37
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

def zip_away(d=0.45):
    """Cartoon 'zip' exit: fast falling pitch + air."""
    t = t_(d)
    f = 1800 * (0.12 ** (t / d))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.005, d * 0.5) * 0.7 + whoosh(d, 2000, 9000, 0.2) * 0.5

def footstep():
    d = 0.06; n = int(SR * d)
    return bandnoise(d, 120, 1500) * env(n, 0.001, 0.015) + np.sin(2 * np.pi * 90 * np.arange(n) / SR) * env(n, 0.001, 0.02)

def radar_ping():
    t = t_(0.5)
    return np.sin(2 * np.pi * 1500 * t) * env(len(t), 0.003, 0.12) * (1 + 0.3 * np.sin(2 * np.pi * 7 * t))

def tada():
    return chime([784, 988, 1175, 1568], 0.06, 0.32)

def pant():
    """Cartoon pant: two breathy noise puffs."""
    out = np.zeros(int(SR * 0.6))
    for k, (lo, hi) in enumerate(((600, 3500), (900, 4500))):
        d = 0.18; n = int(SR * d); x = bandnoise(d, lo, hi) * np.sin(np.linspace(0, np.pi, n)) ** 2
        i = int(k * 0.26 * SR); out[i:i + n] += x
    return out

# ---------------- timeline (s) ----------------
for at in (20.667, 37.533):
    place(whoosh(0.3, 600, 6000, 0.7), at - 0.15, -24)

# hook: capacity bar overflows
place(whoosh(), 0.5, -21); place(riser(0.9), 0.75, -24); place(error_bonk(), 1.75, -18)
for k in range(3):
    place(beep(880), 1.85 + k * 0.16, -24)

# gag: turns and zips away (his real footsteps and panting are in the voice track, so none are synthesized)
place(pop(1100, 380), 2.62, -18, 0.4)
place(zip_away(), 3.25, -19)
place(whoosh(), 3.7, -22)
for k, tt in enumerate((5.0, 8.0, 11.0)):
    place(radar_ping(), tt, -20 - k)
place(beep(520, 0.12), 12.2, -22); place(beep(440, 0.12), 12.45, -23)            # "señal débil"
place(whoosh(0.4, 500, 6000, 0.8), 13.75, -19); place(tada(), 14.05, -18)          # zoom + lupa
# comes back: YA VOLVIÓ, low battery
place(chime([1046, 1318, 1568], 0.07, 0.3), 17.0, -16)
place(pop(900, 300), 17.2, -18)
place(beep(1200, 0.08), 18.0, -21); place(beep(1200, 0.08), 18.25, -21); place(beep(900, 0.18), 18.5, -21)

# B-roll big widgets
place(whoosh(0.5, 200, 4000, 0.6), 20.8, -20)
for tt in (21.18, 22.36, 23.52):
    place(pop(1000, 330), tt, -18); place(beep(700, 0.07), tt + 0.06, -25)
place(impact() * 0.7, 26.46, -15)
place(whoosh(0.5, 200, 4000, 0.6), 27.15, -20); place(riser(1.4), 28.3, -22); place(chime([988, 1318, 1568], 0.07, 0.3), 29.66, -16)
place(whoosh(0.5, 200, 4000, 0.6), 30.65, -20); place(error_bonk(), 32.5, -18)
place(whoosh(0.5, 200, 4000, 0.6), 33.8, -20)
for k in range(4):
    place(whoosh(0.3, 800, 6000, 0.6), 34.2 + k * 0.45, -19); place(pop(700, 250, 0.08), 34.85 + k * 0.45, -16)
place(chime([1320, 1760], 0.08, 0.25), 36.52, -16)

# end: rent card, tiny-guy tag, chat, CTA
place(whoosh(), 37.8, -21); place(impact() * 0.5, 37.95, -18)
place(pop(1300, 420, 0.08), 38.0, -21)
place(whoosh(0.45, 300, 4000), 40.8, -21)
for k in range(9):
    place(key_click(), 40.92 + k * 0.065 + rng.uniform(-0.008, 0.008), -18)
place(send_swoop(), 41.62, -19)
place(chime([1046, 1318], 0.09, 0.22), 42.22, -17)
place(pop(820, 300, 0.1), 42.35, -17)

bed = bed[: int(SR * DUR)]
print("sfx peak dBFS:", round(20 * np.log10(np.abs(bed).max()), 1))
wavfile.write(OUT, SR, (np.clip(bed, -1, 1) * 32767).astype(np.int16))
