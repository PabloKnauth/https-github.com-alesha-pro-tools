"""Voice cleanup + SFX balance + master for the Moto Roka reel.

1. Voice: high-pass, spectral noise reduction (profile from the pauses), EQ, de-esser, compressor.
2. SFX: high-pass (except the impact's low end, kept via the original bed), ducked under the voice.
3. Mix and master to -14 LUFS / -1 dBTP (two-pass loudnorm).
The picture is copied untouched (-c:v copy).

Usage (requires numpy, scipy, noisereduce; intermediate WAVs are written to the current directory):
    python3 audio_master.py video.mp4 voice_raw.wav sfx.wav words.json out.mp4 \
        [--max-gap-db -30] [--scenes 0,5.23,8.77] [--voice-ref -26] [--sfx-db -7]
voice_raw.wav: mono 48 kHz extract of the original clip's audio.
words.json: [[start, end, word, prob], ...] word timestamps; pauses > 0.25 s build the noise profile.
--max-gap-db: only pauses quieter than this (dBFS) go into the noise profile, so pauses that still
    hold breath or voice bleed are not treated as noise.
--scenes: cut times of a multi-take clip; each take's speech is gain-matched to the median take
    before compression (the gain steps on the cuts, so the change is hidden).
--voice-ref: gain the denoised speech to this RMS (dBFS) before EQ/compression, so the compressor
    and expander thresholds act the same on hot and quiet recordings.
--sfx-db: SFX bus gain before ducking (default -7, tuned for the first reel).
--keep-natural: "a-b,c-d" second ranges where the expander is bypassed, so real non-speech sound
    (footsteps, laughter, panting caught by the mic) is kept instead of being pushed down.
"""
import argparse, json, subprocess, sys, numpy as np, noisereduce as nr
from scipy.io import wavfile

ap = argparse.ArgumentParser()
for name in ("src_video", "voice_raw", "sfx", "words", "out"):
    ap.add_argument(name)
ap.add_argument("--max-gap-db", type=float, default=None)
ap.add_argument("--scenes", type=lambda s: [float(v) for v in s.split(",")], default=None)
ap.add_argument("--voice-ref", type=float, default=None)
ap.add_argument("--sfx-db", type=float, default=-7.0)
ap.add_argument("--keep-natural", type=lambda s: [tuple(map(float, r.split("-"))) for r in s.split(",")], default=None)
args = ap.parse_args()
SRC_VIDEO, VOICE_RAW, SFX, WORDS, OUT = args.src_video, args.voice_raw, args.sfx, args.words, args.out
SR = 48000
db = lambda s: 20 * np.log10(np.sqrt((s**2).mean()) + 1e-12)

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-2000:])
    return r.stderr

# ---------- 1. noise reduction (spectral gating with a measured noise profile) ----------
sr, x = wavfile.read(VOICE_RAW)
x = x.astype(np.float32) / 2**31
w = json.load(open(WORDS))
gaps = [(w[i][1] + 0.04, w[i + 1][0] - 0.04) for i in range(len(w) - 1) if w[i + 1][0] - w[i][1] > 0.25]
if args.max_gap_db is not None:
    gaps = [(a, b) for a, b in gaps if db(x[int(a * sr):int(b * sr)]) <= args.max_gap_db]
noise = np.concatenate([x[int(a * sr):int(b * sr)] for a, b in gaps if b > a])
print(f"noise profile: {len(noise) / sr:.2f} s from {len(gaps)} pauses")

if args.scenes:
    bounds = args.scenes + [len(x) / sr]
    levels = []
    for a, b in zip(bounds[:-1], bounds[1:]):
        ws = [q for q in w if a <= q[0] < b]
        levels.append(db(np.concatenate([x[int(q[0] * sr):int(q[1] * sr)] for q in ws])) if ws else None)
    target = float(np.median([l for l in levels if l is not None]))
    for (a, b), l in zip(zip(bounds[:-1], bounds[1:]), levels):
        if l is not None:
            g = float(np.clip(target - l, -6, 6))
            x[int(a * sr):int(b * sr)] *= 10 ** (g / 20)
            print(f"take {a:6.2f}-{b:6.2f}s: {l:6.1f} dBFS -> gain {g:+.1f} dB")
clean = nr.reduce_noise(y=x, sr=sr, y_noise=noise, stationary=True, prop_decrease=0.92,
                        n_std_thresh_stationary=2.0, freq_mask_smooth_hz=300, time_mask_smooth_ms=60)
if args.voice_ref is not None:
    speech = np.concatenate([clean[int(q[0] * sr):int(q[1] * sr)] for q in w])
    g = args.voice_ref - db(speech)
    clean = clean * 10 ** (g / 20)
    print(f"voice to reference: {db(speech):.1f} -> {args.voice_ref:.1f} dBFS ({g:+.1f} dB)")
wavfile.write("voice_nr.wav", sr, clean.astype(np.float32))

# ---------- 2. voice polish ----------
VOICE_CHAIN = ",".join([
    "highpass=f=85:poles=2", "highpass=f=85:poles=2",          # 24 dB/oct rumble cut
    "equalizer=f=240:t=q:w=1.1:g=-3",                           # boxiness / room
    "equalizer=f=3300:t=q:w=1.0:g=2.5",                         # presence, intelligibility
    "highshelf=f=9500:g=2",                                     # air
    "deesser=i=0.35:m=0.5:f=0.5",
    "acompressor=threshold=-24dB:ratio=3:attack=6:release=90:knee=4:makeup=4dB",
    "agate=threshold=0.018:ratio=1.8:range=0.3:attack=4:release=180:knee=3",  # soft expander for pauses
    "alimiter=limit=0.89:attack=3:release=40:level=disabled",
])
run(["ffmpeg", "-v", "error", "-y", "-i", "voice_nr.wav", "-af", VOICE_CHAIN, "-ar", str(SR), "-ac", "1",
     "-c:a", "pcm_s24le", "voice_proc.wav"])
if args.keep_natural:                                            # same chain minus the expander, crossfaded in
    no_gate = ",".join(f for f in VOICE_CHAIN.split(",") if not f.startswith("agate"))
    run(["ffmpeg", "-v", "error", "-y", "-i", "voice_nr.wav", "-af", no_gate, "-ar", str(SR), "-ac", "1",
         "-c:a", "pcm_f32le", "voice_nogate.wav"])
    run(["ffmpeg", "-v", "error", "-y", "-i", "voice_proc.wav", "-c:a", "pcm_f32le", "voice_gate.wav"])
    _, g = wavfile.read("voice_gate.wav"); _, ng = wavfile.read("voice_nogate.wav")
    n = min(len(g), len(ng)); w8 = np.zeros(n, np.float32); fade = int(0.08 * SR)
    for a, b in args.keep_natural:
        i0, i1 = int(a * SR), min(n, int(b * SR)); w8[i0:i1] = 1
        w8[max(0, i0 - fade):i0] = np.linspace(0, 1, i0 - max(0, i0 - fade)); w8[i1:i1 + fade] = np.linspace(1, 0, len(w8[i1:i1 + fade]))
        print(f"natural sound kept {a:.2f}-{b:.2f}s")
    wavfile.write("voice_proc_mix.wav", SR, (g[:n] * (1 - w8) + ng[:n] * w8).astype(np.float32))
    run(["ffmpeg", "-v", "error", "-y", "-i", "voice_proc_mix.wav", "-c:a", "pcm_s24le", "voice_proc.wav"])

# ---------- 3. mix: SFX ducked under the voice, then 2-pass loudnorm ----------
MIX = (
    "[0:a]aformat=channel_layouts=mono,asplit=2[v][sc];"
    f"[1:a]volume={args.sfx_db}dB,highpass=f=60,equalizer=f=3000:t=q:w=1.2:g=-2[s];"  # SFX bus: under the voice, room for presence
    "[s][sc]sidechaincompress=threshold=0.03:ratio=4:attack=8:release=220:makeup=1[sd];"
    "[v]pan=stereo|c0=c0|c1=c0[vs];"
    "[vs][sd]amix=inputs=2:normalize=0:duration=first[m]"
)
run(["ffmpeg", "-v", "error", "-y", "-i", "voice_proc.wav", "-i", SFX, "-filter_complex", MIX,
     "-map", "[m]", "-ar", str(SR), "-c:a", "pcm_s24le", "mix_pre.wav"])

TARGET = "I=-14:TP=-1.0:LRA=9"
stats = run(["ffmpeg", "-i", "mix_pre.wav", "-af", f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"])
m = json.loads(stats[stats.rindex("{"):])
ln = (f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
run(["ffmpeg", "-v", "error", "-y", "-i", "mix_pre.wav", "-af", ln + ",alimiter=limit=0.89:level=disabled",
     "-ar", str(SR), "-c:a", "pcm_s24le", "mix_master.wav"])

run(["ffmpeg", "-v", "error", "-y", "-i", SRC_VIDEO, "-i", "mix_master.wav", "-map", "0:v", "-map", "1:a",
     "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", OUT])
print("done", OUT)
