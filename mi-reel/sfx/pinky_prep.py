"""Prepare a talking clip for the Vestidos Pinky template: tone-map HDR, tighten pauses, remap word timings.

Usage:
    python3 pinky_prep.py src.mov words.json out_dir [--gap 0.28] [--pad 0.09] [--from 0] [--to 999]
words.json: [[start, end, word, prob], ...] (faster-whisper word timestamps).
Writes out_dir/clip.mp4 (720x1280 H.264 + AAC), out_dir/words.json (remapped, corrected) and
out_dir/cuts.json (seconds where a pause was removed, i.e. jump cuts to hide with a zoom/flash).
"""
import argparse, json, os, re, subprocess

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("words"); ap.add_argument("out")
ap.add_argument("--gap", type=float, default=0.28, help="pauses longer than this are shortened")
ap.add_argument("--pad", type=float, default=0.09, help="audio kept around each phrase")
ap.add_argument("--from", dest="t0", type=float, default=0.0)
ap.add_argument("--to", dest="t1", type=float, default=1e9)
args = ap.parse_args()
os.makedirs(args.out, exist_ok=True)

# Whisper mis-hearings seen in this client's clips (word-level, punctuation kept)
FIX = {"piyamas": "pijamas", "pillamas": "pijamas", "resortir": "resurtir", "comprendas": "prendas",
       "podamos": "podemos", "conocer": "conocer", "entranos": "Entra", "asortir": "surtir"}
PHRASES = [  # (sequence to find, replacement) on lower-cased bare words
    (["resurtir", "de", "tu"], ["resurtir", "tu"]),
    (["pesos", "se", "compra"], ["pesos", "de", "compra"]),
    (["entra", "a", "tienda"], ["Entra", "a", "nuestra", "tienda"]),
]

def bare(w): return re.sub(r"[^\wáéíóúñü]", "", w.lower())

words = [w for w in json.load(open(args.words)) if args.t0 <= w[0] < args.t1]
for w in words:
    b = bare(w[2])
    if b in FIX:
        w[2] = re.sub(re.escape(b), FIX[b], w[2], flags=re.I) if b != FIX[b].lower() else w[2]
# phrase fixes
i = 0
while i < len(words):
    for seq, rep in PHRASES:
        if [bare(x[2]) for x in words[i:i + len(seq)]] == seq:
            span0, span1 = words[i][0], words[i + len(seq) - 1][1]
            tail = re.sub(r"^[\wáéíóúñüÁÉÍÓÚÑÜ]+", "", words[i + len(seq) - 1][2])  # keep trailing punctuation
            step = (span1 - span0) / len(rep)
            new = [[round(span0 + k * step, 2), round(span0 + (k + 1) * step, 2), r, 0.9] for k, r in enumerate(rep)]
            new[-1][2] += tail
            words[i:i + len(seq)] = new
            break
    i += 1

# speech regions: merge words separated by short pauses
regions = []
for w in words:
    s, e = max(args.t0, w[0] - args.pad), min(args.t1, w[1] + args.pad)
    if regions and s - regions[-1][1] <= args.gap:
        regions[-1][1] = max(regions[-1][1], e)
    else:
        regions.append([s, e])

# remap times
def remap(t):
    acc = 0.0
    for s, e in regions:
        if t < s: return acc
        if t <= e: return acc + (t - s)
        acc += e - s
    return acc
out_words = [[round(remap(w[0]), 3), round(remap(w[1]), 3), w[2], w[3]] for w in words]
cuts, acc = [], 0.0
for s, e in regions[:-1]:
    acc += e - s; cuts.append(round(acc, 3))

trc = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=color_transfer",
                      "-of", "csv=p=0", args.src], capture_output=True, text=True).stdout.strip()
tone = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,"
        "zscale=t=bt709:m=bt709:r=tv,format=yuv420p,") if trc in ("arib-std-b67", "smpte2084") else ""
parts, labels = [], []
for k, (s, e) in enumerate(regions):
    d = e - s
    parts.append(f"[0:v]trim={s:.3f}:{e:.3f},setpts=PTS-STARTPTS,{tone}scale=720:1280:flags=lanczos,fps=30[v{k}];"
                 f"[0:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st={max(0, d - 0.01):.3f}:d=0.01[a{k}];")
    labels.append(f"[v{k}][a{k}]")
fc = "".join(parts) + "".join(labels) + f"concat=n={len(regions)}:v=1:a=1[v][a]"
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", args.src, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-pix_fmt", "yuv420p", "-color_primaries", "bt709",
                "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
                os.path.join(args.out, "clip.mp4")], check=True)
json.dump(out_words, open(os.path.join(args.out, "words.json"), "w"), ensure_ascii=False)
json.dump(cuts, open(os.path.join(args.out, "cuts.json"), "w"))
total = sum(e - s for s, e in regions)
print(f"{'HDR→SDR, ' if tone else ''}{len(regions)} tramos, {len(cuts)} cortes, "
      f"{(min(args.t1, words[-1][1] + args.pad) - max(args.t0, 0)) - total:.1f}s de pausas quitadas -> {total:.1f}s")
