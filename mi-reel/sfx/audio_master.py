"""Voice cleanup + SFX balance + master for the Moto Roka reel.

1. Voice: high-pass, spectral noise reduction (profile from the pauses), EQ, de-esser, compressor.
2. SFX: high-pass (except the impact's low end, kept via the original bed), ducked under the voice.
3. Mix and master to -14 LUFS / -1 dBTP (two-pass loudnorm).
The picture is copied untouched (-c:v copy).

Usage (requires numpy, scipy, noisereduce; intermediate WAVs are written to the current directory):
    python3 audio_master.py video.mp4 voice_raw.wav sfx.wav words.json out.mp4
voice_raw.wav: mono 48 kHz extract of the original clip's audio.
words.json: [[start, end, word, prob], ...] word timestamps; pauses > 0.25 s build the noise profile.
"""
import json, subprocess, sys, numpy as np, noisereduce as nr
from scipy.io import wavfile

SRC_VIDEO, VOICE_RAW, SFX, WORDS, OUT = sys.argv[1:6]
SR = 48000

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-2000:])
    return r.stderr

# ---------- 1. noise reduction (spectral gating with a measured noise profile) ----------
sr, x = wavfile.read(VOICE_RAW)
x = x.astype(np.float32) / 2**31
w = json.load(open(WORDS))
gaps = [(w[i][1] + 0.04, w[i + 1][0] - 0.04) for i in range(len(w) - 1) if w[i + 1][0] - w[i][1] > 0.25]
noise = np.concatenate([x[int(a * sr):int(b * sr)] for a, b in gaps if b > a])
print(f"noise profile: {len(noise) / sr:.2f} s from {len(gaps)} pauses")
clean = nr.reduce_noise(y=x, sr=sr, y_noise=noise, stationary=True, prop_decrease=0.92,
                        n_std_thresh_stationary=2.0, freq_mask_smooth_hz=300, time_mask_smooth_ms=60)
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

# ---------- 3. mix: SFX ducked under the voice, then 2-pass loudnorm ----------
MIX = (
    "[0:a]aformat=channel_layouts=mono,asplit=2[v][sc];"
    "[1:a]volume=-7dB,highpass=f=60,equalizer=f=3000:t=q:w=1.2:g=-2[s];"  # SFX bus: under the voice, room for presence
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
