"""Synthesized sound effects for the Pablo Knauth personal-brand reel (paper / marker / stamp palette).
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

SR, DUR = 48000, 21.97
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

def paper(d=0.28):
    """Paper rustle: crackly band noise with random micro-bursts."""
    n = int(SR * d)
    x = bandnoise(d, 1200, 9000)
    bursts = (rng.random(n) < 0.004).astype(float)
    bursts = np.convolve(bursts, np.exp(-np.arange(300) / 60), mode="same")
    return x * (0.35 + bursts * 2.5) * env(n, 0.01, d * 0.5)

def tape():
    """Tape rip: rising-pitch noise with fast AM flutter."""
    d = 0.22; n = int(SR * d); t = np.arange(n) / SR
    flutter = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (60 + 240 * t / d) * t))
    return bandnoise(d, 2000, 10000) * flutter * env(n, 0.005, 0.12)

def marker(d=0.45):
    """Felt-tip scribble: mid noise, 9-14 Hz stroke modulation."""
    n = int(SR * d); t = np.arange(n) / SR
    am = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * (9 + 5 * rng.random()) * t))
    x = bandnoise(d, 700, 5000) * am
    e = np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.06)
    return x * e

def typewriter_key():
    d = 0.04; n = int(SR * d)
    return bandnoise(d, 900, 6000) * env(n, 0.0005, 0.006) + tick(rng.uniform(1700, 2300), d) * 0.5

def stamp_thud():
    t = t_(0.35)
    body = np.sin(2 * np.pi * (70 + 90 * np.exp(-t * 30)) * t) * env(len(t), 0.001, 0.08)
    slap = bandnoise(0.35, 300, 4000) * env(len(t), 0.0008, 0.02)
    return body + slap * 0.9

# ---------------- timeline (s) ----------------
# hook: robot note types, gets crossed out; robot sticker
place(paper(), 1.85, -15, -0.4); place(tape(), 1.95, -17, -0.5)
for k in range(13):
    place(typewriter_key(), 1.95 + k * 0.055 + rng.uniform(-0.01, 0.01), -16, -0.3)
place(marker(0.35), 2.7, -17, -0.3)
place(pop(700, 250, 0.1), 2.72, -17, 0.5)

# camera cut + PABLO KNAUTH behind + crown drawn
place(whoosh(0.35, 400, 5000, 0.75), 3.25, -22)
place(whoosh(0.5, 200, 3000, 0.6), 3.4, -19)
place(marker(0.5), 5.0, -19, 0.0)

# 4.56 / 6.12 notes, underline
place(paper(), 4.56, -15, -0.4); place(tape(), 4.66, -17, -0.5)
place(paper(0.22), 6.12, -16, 0.4); place(marker(0.3), 6.4, -21, 0.4)

# 7.82 / 8.38 / 8.9 scraps, arrow + Claude note
for at, pan in ((7.82, -0.5), (8.38, 0.5), (8.9, 0.0)):
    place(paper(0.22), at, -15, pan); place(tape(), at + 0.08, -16, pan)
place(marker(0.45), 9.2, -19, 0.4); place(pop(), 9.25, -19, 0.3)

# sunglasses drop on at the start
place(whoosh(0.3, 800, 7000, 0.8), 0.02, -24); place(pop(1100, 380, 0.08), 0.3, -18)

def cape_flap(d=0.5):
    """Cloth flap: low whoosh with 7 Hz flutter."""
    n = int(SR * d); t = np.arange(n) / SR
    return whoosh(d, 150, 2500, 0.35) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 7 * t)))

# hero transformation: glasses fly off, cape, mask, P badge; glasses come back
place(whoosh(0.3, 1200, 8000, 0.3), 11.98, -19, 0.3)
place(cape_flap(), 12.08, -17)
place(pop(600, 200, 0.12), 12.16, -16); place(pop(1300, 420, 0.08), 12.24, -18)
place(whoosh(0.25, 800, 6000, 0.8), 13.62, -22); place(pop(1100, 380, 0.08), 13.8, -22)

# Logan: bicep sticker, "¿sí? en serio" punch
place(pop(900, 300), 12.2, -17, -0.4); place(marker(0.6), 12.25, -21, -0.4)
place(whoosh(0.3, 500, 6000, 0.7), 12.94, -21); place(pop(1000, 320), 13.06, -16, 0.4)

# biblioteca: books sticker + note, GRATIS stamp
place(pop(820, 280), 14.22, -17, -0.4); place(marker(0.6), 14.25, -22, -0.4)
place(paper(), 14.3, -15); place(tape(), 14.4, -17)
place(stamp_thud(), 16.3, -14)

# CTA: follow tag, DM bubble typing, signature
place(paper(), 17.42, -15, 0.5); place(tape(), 17.5, -17, 0.5)
place(paper(), 17.85, -16, -0.3)
for k in range(10):
    place(key_click(), 18.0 + k * 0.07 + rng.uniform(-0.01, 0.01), -15, -0.2)
place(send_swoop(), 18.72, -20, -0.2)
place(marker(0.75), 20.6, -16)
place(sparkle(), 21.0, -20, 0.4)

bed = bed[: int(SR * DUR)]
print("sfx peak dBFS:", round(20 * np.log10(np.abs(bed).max()), 1))
wavfile.write(OUT, SR, (np.clip(bed, -1, 1) * 32767).astype(np.int16))
