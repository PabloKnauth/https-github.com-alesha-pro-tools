"""Pablo Knauth style person layer: cutout (B&W with grain, or natural colour with --color) with a cream
paper border and soft shadow,
exported with alpha (VP9 WebM) so Remotion can put an animated background behind it.

Usage (requires numpy, opencv-python-headless, onnxruntime):
    python3 person_cutout.py clip.mov u2net_human_seg.onnx out.webm [--width 1080 --height 1920]
Model: u2net_human_seg.onnx from github.com/danielgatis/rembg releases (md5 c09ddc2e0104f800e3e1bb4652583d1f).
"""
import argparse, subprocess, numpy as np, cv2, onnxruntime as ort

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("model"); ap.add_argument("out")
ap.add_argument("--width", type=int, default=1080); ap.add_argument("--height", type=int, default=1920)
ap.add_argument("--border", type=int, default=24, help="paper border width in px (output scale)")
ap.add_argument("--color", action="store_true", help="keep the natural colour (no B&W grade, no grain)")
args = ap.parse_args()
W, H, FPS = args.width, args.height, 30

sess = ort.InferenceSession(args.model, providers=["CPUExecutionProvider"])
inp = sess.get_inputs()[0].name

def raw_mask(bgr):
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    x = cv2.resize(rgb, (320, 320), interpolation=cv2.INTER_LANCZOS4) / max(rgb.max(), 1)
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    out = sess.run(None, {inp: x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
    return (out - out.min()) / (out.max() - out.min() + 1e-8)

rng = np.random.default_rng(3)
def noise_field(scale, seed):
    r = np.random.default_rng(seed).standard_normal((H // scale + 2, W // scale + 2)).astype(np.float32)
    return cv2.resize(cv2.GaussianBlur(r, (0, 0), 1.2), (W, H), interpolation=cv2.INTER_CUBIC)

# a few fixed edge-roughness fields, cycled at 12 fps for a hand-made "boil"
EDGE = [noise_field(9, s) * 0.55 + noise_field(3, s + 50) * 0.25 for s in range(3)]
PAPER = noise_field(2, 99) * 6 + noise_field(14, 98) * 5          # cream paper texture
CREAM = np.array([206, 228, 240], np.float32)                     # BGR #F0E4CE

def bw(bgr):
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    g = np.clip((g - 0.06) / 0.9, 0, 1)
    g = g * g * (3 - 2 * g) * 0.75 + g * 0.25                      # photographic S-curve
    return g

dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", args.src, "-vf", f"scale={W}:{H}:flags=lanczos",
                        "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}",
                        "-r", str(FPS), "-i", "-", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", "16",
                        "-b:v", "0", "-row-mt", "1", "-cpu-used", "4", "-auto-alt-ref", "0", args.out],
                       stdin=subprocess.PIPE)
ema, i = None, 0
k = args.border
while True:
    raw = dec.stdout.read(W * H * 3)
    if len(raw) < W * H * 3: break
    img = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
    small = cv2.resize(img, (W // 3, H // 3), interpolation=cv2.INTER_AREA)
    m = cv2.resize(raw_mask(small), (W, H), interpolation=cv2.INTER_LINEAR)
    ema = m if ema is None else 0.55 * m + 0.45 * ema               # temporal smoothing, less flicker
    person = np.clip((ema - 0.35) / 0.3, 0, 1)
    person = cv2.GaussianBlur(person, (0, 0), 1.2)

    # paper border: grow the silhouette, roughen the edge, hard-ish cut like scissors
    hard = (person > 0.5).astype(np.uint8)
    dist = cv2.distanceTransform(1 - hard, cv2.DIST_L2, 5)
    edge = EDGE[(i // 2.5).__int__() % 3]
    border = np.clip((k + edge * 7 - dist) / 1.6, 0, 1)
    border = np.maximum(border, person)

    if args.color:
        photo = img.astype(np.float32)                              # natural colour, untouched
    else:
        g = bw(img)
        grain = rng.standard_normal((H, W)).astype(np.float32) * 0.045
        g = np.clip(g + grain, 0, 1)
        photo = np.dstack([g * 255 * 0.97, g * 255 * 0.985, g * 255])   # very slightly warm whites
    paper = CREAM + PAPER[..., None]
    rgb = photo * person[..., None] + paper * (1 - person[..., None])

    # soft drop shadow (down-right), only outside the paper
    shifted = cv2.warpAffine(border, np.float32([[1, 0, 6], [0, 1, 10]]), (W, H), borderValue=0)  # no wrap-around
    sh = cv2.GaussianBlur(shifted, (0, 0), 9) * 0.45
    alpha = np.maximum(border, sh * (1 - border))
    rgb = rgb * (border / np.maximum(alpha, 1e-4))[..., None]       # shadow pixels are black

    out = np.dstack([rgb[..., 2], rgb[..., 1], rgb[..., 0], alpha * 255])
    enc.stdin.write(np.clip(out, 0, 255).astype(np.uint8).tobytes())
    i += 1
    if i % 60 == 0: print(f"{i} frames", flush=True)
enc.stdin.close(); enc.wait(); dec.wait()
print("done", i, "frames ->", args.out)
