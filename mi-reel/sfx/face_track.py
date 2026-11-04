"""Per-frame eye positions (output pixels) for overlays that sit on the face, e.g. sunglasses or a mask.
OpenCV Haar face + eye detection on the source clip, geometric fallback from the face box when the eyes
are not found, then outlier rejection and smoothing.

Usage: python3 face_track.py clip.mov out.json [--width 1080 --height 1920] [--scale 0.75]
Writes {"l": [[x, y], ...], "r": [[x, y], ...], "face": [[x, y, w, h], ...]}.
"""
import argparse, json, subprocess, numpy as np, cv2

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--width", type=int, default=1080); ap.add_argument("--height", type=int, default=1920)
ap.add_argument("--scale", type=float, default=1.0, help="same --scale as person_cutout.py (bottom-centre anchor)")
args = ap.parse_args()
W, H = args.width, args.height
face_cc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
eye_cc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

PW, PH = W // 2, H // 2                                     # detect at half resolution
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", args.src, "-vf", f"scale={PW}:{PH}",
                        "-f", "rawvideo", "-pix_fmt", "gray", "-"], stdout=subprocess.PIPE)
faces, eyes_l, eyes_r, from_eyes = [], [], [], []
prev = None
while True:
    raw = dec.stdout.read(PW * PH)
    if len(raw) < PW * PH: break
    g = cv2.equalizeHist(np.frombuffer(raw, np.uint8).reshape(PH, PW))
    fs = face_cc.detectMultiScale(g, 1.1, 5, minSize=(120, 120))
    if len(fs):
        f = max(fs, key=lambda r: r[2] * r[3]).astype(float)
    elif prev is not None:
        f = prev
    else:
        f = np.array([PW * 0.25, PH * 0.3, PW * 0.5, PW * 0.5])
    prev = f
    x, y, w, h = f
    # geometric estimate: eyes at ~30% / 70% of width, 40% of height of the face box
    el, er = np.array([x + w * 0.31, y + h * 0.41]), np.array([x + w * 0.69, y + h * 0.41])
    roi = g[int(y + h * 0.18):int(y + h * 0.58), int(x):int(x + w)]
    es = eye_cc.detectMultiScale(roi, 1.1, 6, minSize=(int(w * 0.12), int(w * 0.12)), maxSize=(int(w * 0.32), int(w * 0.32)))
    ok = False
    if len(es) >= 2:
        cs = sorted([(ex + ew / 2 + x, ey + eh / 2 + y + h * 0.18) for ex, ey, ew, eh in es], key=lambda c: c[0])
        a, b = np.array(cs[0]), np.array(cs[-1])
        d = np.linalg.norm(b - a)
        if 0.25 * w < d < 0.55 * w and abs(a[1] - b[1]) < 0.12 * w:   # plausible eye pair
            el, er, ok = a, b, True
    faces.append(f); eyes_l.append(el); eyes_r.append(er); from_eyes.append(ok)
dec.wait()

L, R, F = np.array(eyes_l), np.array(eyes_r), np.array(faces)
ok = np.array(from_eyes)
# where the eye detector failed, keep the face-box estimate but correct its bias with the median offset
if ok.sum() > 10:
    for arr, idx in ((L, 0), (R, 1)):
        est = np.stack([F[:, 0] + F[:, 2] * (0.31 if idx == 0 else 0.69), F[:, 1] + F[:, 3] * 0.41], 1)
        bias = np.median(arr[ok] - est[ok], 0)
        arr[~ok] = est[~ok] + bias

def smooth(a, k=4):
    a = a.copy()
    med = np.array([np.median(a[max(0, i - k):i + k + 1], 0) for i in range(len(a))])   # kill spikes
    pad = np.pad(med, ((k, k), (0, 0)), mode="edge")
    ker = np.ones(2 * k + 1) / (2 * k + 1)
    return np.stack([np.convolve(pad[:, j], ker, mode="valid") for j in range(a.shape[1])], 1)

s = W / PW
SC = args.scale
SW, SH = int(round(W * SC / 2) * 2), int(round(H * SC / 2) * 2)
X0, Y0 = (W - SW) // 2, H - SH                                     # matches person_cutout.py --scale
pt = lambda a: np.stack([X0 + a[:, 0] * s * SC, Y0 + a[:, 1] * s * SC], 1)
Fs = smooth(F) * s
Fo = np.stack([X0 + Fs[:, 0] * SC, Y0 + Fs[:, 1] * SC, Fs[:, 2] * SC, Fs[:, 3] * SC], 1)
out = {"l": pt(smooth(L)).round(1).tolist(), "r": pt(smooth(R)).round(1).tolist(), "face": Fo.round(1).tolist()}
json.dump(out, open(args.out, "w"))
print(f"{len(L)} frames, eyes detected directly in {ok.sum()} ({ok.mean() * 100:.0f}%)")
