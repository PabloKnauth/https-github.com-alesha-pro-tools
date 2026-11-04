"""Per-frame head position from an alpha cutout video (top of the silhouette and its centre x).
Writes {"top": [...], "cx": [...]} in output pixels, smoothed, for overlays that follow the head.

Usage: python3 head_track.py cutout.webm out.json
"""
import json, subprocess, sys, numpy as np

SRC, OUT = sys.argv[1:3]
W, H = 1080, 1920
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-i", SRC, "-vf", "alphaextract",
                        "-f", "rawvideo", "-pix_fmt", "gray", "-"], stdout=subprocess.PIPE)
tops, cxs = [], []
while True:
    raw = dec.stdout.read(W * H)
    if len(raw) < W * H: break
    a = np.frombuffer(raw, np.uint8).reshape(H, W) > 200          # paper + person, not the shadow
    rows = np.where(a.sum(1) > 25)[0]
    top = int(rows[0]) if len(rows) else (tops[-1] if tops else 500)
    band = a[top:top + 160]                                     # crown of the head
    xs = np.where(band.any(0))[0]
    cx = float(xs.mean()) if len(xs) else (cxs[-1] if cxs else W / 2)
    tops.append(top); cxs.append(cx)
dec.wait()

def smooth(v, k=5):
    v = np.asarray(v, float); pad = np.pad(v, k, mode="edge")
    return np.convolve(pad, np.ones(2 * k + 1) / (2 * k + 1), mode="same")[k:-k]

json.dump({"top": smooth(tops).round(1).tolist(), "cx": smooth(cxs).round(1).tolist()}, open(OUT, "w"))
print(f"{len(tops)} frames; top {min(tops)}-{max(tops)} px, cx {min(cxs):.0f}-{max(cxs):.0f} px")
