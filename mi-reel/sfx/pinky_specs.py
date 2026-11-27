"""Edit decisions for the Vestidos Pinky ads: builds the PinkyAd props and the SFX/music events per video.

Usage: python3 pinky_specs.py <job_dir> <name>   (job_dir holds prep/words.json and prep/cuts.json)
Writes job_dir/props.json (for `remotion render PinkyAd --props`) and job_dir/events.json (pinky_music.py).
Every overlay is anchored to a word of the transcript, so timings follow the real speech.
"""
import json, re, subprocess, sys
import cv2, numpy as np

JOB, NAME = sys.argv[1], sys.argv[2]
W = json.load(open(f"{JOB}/prep/words.json"))
JUMPS = json.load(open(f"{JOB}/prep/cuts.json"))
CLIP = f"pinky/{NAME}/clip.mp4"
DUR = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                            f"public/{CLIP}"], capture_output=True, text=True).stdout)
scene = subprocess.run(["ffmpeg", "-i", f"public/{CLIP}", "-vf", "select='gt(scene,0.25)',showinfo", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
SCENES = [float(x) for x in re.findall(r"pts_time:([0-9.]+)", scene)]

def bare(w): return re.sub(r"[^\wáéíóúñü%]", "", w.lower())
def at(word, n=1, after=0.0):
    """Start time of the n-th occurrence of `word` (bare match) after `after` seconds."""
    k = 0
    for s, e, w, *_ in W:
        if s >= after and bare(w) == bare(word):
            k += 1
            if k == n: return round(s, 2)
    raise SystemExit(f"palabra no encontrada: {word} #{n} después de {after}")
def end(word, n=1, after=0.0):
    t = at(word, n, after)
    return round(next(e for s, e, *_ in W if abs(round(s, 2) - t) < 0.006), 2)

URL = "tienda.vestidospinky.com"
CAT = "pinky/catalog_vestidos.jpg"
ov, punches, hl, em = [], [], [], []
BROLL = []

def face_track(t0, t1, step=0.2):
    """Face centre/width in the presenter clip (720x1280) every `step` s, smoothed, for the PiP framing."""
    cas = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(f"public/{CLIP}")
    pts = []
    for t in np.arange(t0 - 0.2, t1 + 0.4, step):
        cap.set(cv2.CAP_PROP_POS_MSEC, max(0, t) * 1000); ok, f = cap.read()
        if not ok: continue
        fs = cas.detectMultiScale(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), 1.1, 6, minSize=(90, 90))
        if len(fs):
            x, y, w, h = max(fs, key=lambda r: r[2] * r[3]); pts.append([round(float(t), 2), x + w / 2, y + h / 2, w])
    a = np.array(pts, float)
    for c in (1, 2, 3): a[:, c] = np.convolve(np.pad(a[:, c], 2, mode="edge"), np.ones(5) / 5, "valid")
    return [[round(r[0], 2), round(r[1]), round(r[2]), round(r[3])] for r in a]

if NAME in ("v1", "v2"):   # Black Friday, presentador de rojo, primer plano
    ov += [{"type": "price", "at": at("2000") - 0.05, "until": end("compra") + 0.3, "value": "$2,000"}]
    ov += [{"type": "catalog", "at": at("catálogo") - 0.15, "until": end("actualizado") + 0.25, "image": CAT}]
    ov += [{"type": "stack", "items": [[at("pijamas"), "PIJAMAS NUEVAS"]], "until": end("nuevas") + 0.4}]
    ov += [{"type": "money", "at": at("revender"), "until": min(DUR, end("ganancia") + 0.4)}]
    punches = [[at("black"), 0.08], [at("20"), 0.1], [at("2000"), 0.06], [at("500"), 0.1], [at("mayoreo"), 0.07]]
    hl = ["domingo", "descuento", "almacén", "negocio", "méxico", "pedido"]
    em = ["black", "friday", "20", "500", "mayoreo", "revender"]
    if NAME == "v1":
        ov += [{"type": "globe", "at": at("envíos") - 0.1, "until": end("méxico") + 0.2}]
        ov += [{"type": "url", "at": at("haz") - 0.1, "until": DUR, "text": URL}]
        punches += [[at("entra"), 0.08]]
    else:
        ov += [{"type": "url", "at": max(end("ganancia") - 0.9, at("revender") + 0.6), "until": DUR, "text": URL}]

elif NAME == "v3":         # voz en off sobre B-roll del almacén
    ov += [{"type": "stack", "items": [[at("ropa"), "ROPA DE MUJER"], [at("mayoreo"), "A PRECIO DE MAYOREO"]], "until": min(at("pues"), at("revenderlo")) - 0.05}]
    ov += [{"type": "money", "at": at("revenderlo"), "until": at("pues") + 0.1}]
    ov += [{"type": "price", "at": at("2000") - 0.1, "until": end("pesos") + 0.3, "value": "$2,000"}]
    ov += [{"type": "globe", "at": at("envíos") - 0.2, "until": end("méxico") + 0.25}]
    ov += [{"type": "money", "at": at("ingreso"), "until": end("extra") + 0.4}]
    ov += [{"type": "catalog", "at": at("así") - 0.1, "until": end("carrito") + 0.2, "image": CAT}]
    ov += [{"type": "stack", "items": [[at("tarjeta"), "TARJETA DE DÉBITO"], [at("crédito"), "CRÉDITO"], [at("efectivo"), "PAGO EN EFECTIVO"]], "until": at("enviamos") + 0.1}]
    ov += [{"type": "url", "at": at("enviamos") - 0.2, "until": DUR, "text": URL}]
    punches = [[at("black"), 0.08], [at("20"), 0.1], [at("500"), 0.1], [at("efectivo"), 0.06]]
    hl = ["negocio", "domingo", "descuento", "surtirla", "revenderla", "saldo", "surtirlo", "casa"]
    em = ["black", "friday", "20", "500"]

elif NAME == "v4":         # el gag del jefe + tutorial de compra en la laptop
    ov += [{"type": "stack", "items": [[at("pijamas"), "PIJAMAS"], [at("vestidos"), "VESTIDOS"], [at("blusas"), "BLUSAS"]], "until": at("ahora") + 0.2}]
    ov += [{"type": "stack", "items": [[at("mayoreo"), "PRECIOS DE MAYOREO"], [at("descuentos"), "DESCUENTOS"], [at("promociones"), "PROMOCIONES"]], "until": at("haz") + 0.3}]
    ov += [{"type": "url", "at": at("entra") - 0.1, "until": at("sencillo") + 0.3, "text": URL}]
    ov += [{"type": "stack", "items": [[at("prenda", 1, at("oprimes") - 0.1), "ELIGE LA PRENDA"], [at("talla"), "LA TALLA"], [at("cantidad"), "LA CANTIDAD"], [at("carrito"), "AL CARRITO"]], "until": at("descuentos", 1, at("carrito")) + 0.5}]
    punches = [[at("gritado"), 0.08], [at("harta"), 0.1], [at("jefa"), 0.08], [at("500"), 0.1], [at("renuncia"), 0.12]]
    hl = ["pinky", "negocio", "boutique", "casa", "sencillo", "compra", "empresa"]
    em = ["harta", "jefa", "500", "renuncia"]

elif NAME == "v5":         # anuncio propio armado con el stock (presentador de rojo + B-roll + laptop)
    ov += [{"type": "stack", "items": [[at("vestidos"), "VESTIDOS"], [at("blusas"), "BLUSAS"]], "until": at("almacén") + 0.2}]
    ov += [{"type": "stack", "items": [[at("blusas", 2), "BLUSAS"], [at("vestidos", 2), "VESTIDOS"], [at("suéteres"), "SUÉTERES"], [at("pijamas"), "PIJAMAS"]], "until": at("para", 2) - 0.05}]
    ov += [{"type": "money", "at": at("ingreso"), "until": end("extra") + 0.1}]
    ov += [{"type": "stack", "items": [[at("calidad", 2), "PRENDAS DE CALIDAD"], [at("completamente"), "COMPLETAMENTE NUEVAS"]], "until": end("nuevas") + 0.1}]
    ov += [{"type": "globe", "at": at("te", 2) - 0.05, "until": end("casa") + 0.05}]
    ov += [{"type": "url", "at": at("tienda") - 0.1, "until": DUR, "text": URL}]
    b1 = (at("de", 1, at("tenemos", 2)), at("para", 2) - 0.05); b3 = (at("así") - 0.02, DUR)
    BROLL = [{"src": "pinky/v5/aisles.mp4", "at": b1[0], "until": b1[1], "from": 0, "pip": face_track(*b1)},
             {"src": "pinky/v5/racks.mp4", "at": at("todo"), "until": end("nuevas") + 0.05, "from": 0},
             {"src": "pinky/v5/laptop.mp4", "at": b3[0], "until": b3[1], "from": 0.5, "pip": face_track(*b3)}]
    punches = [[at("ropa"), 0.06], [at("mayoreo"), 0.08], [at("500"), 0.1], [at("negocio", 2), 0.06]]
    hl = ["calidad", "almacén", "negocio", "emprender", "pedido"]
    em = ["mayoreo", "500"]

FULL = [o["at"] for o in ov if o["type"] in ("globe", "catalog")]
cuts = sorted(set(round(c, 2) for c in JUMPS))
flashes = sorted(set([round(c, 2) for c in SCENES] + FULL + [b["at"] for b in BROLL]))
props = {"clip": CLIP, "duration": round(DUR, 3), "words": W, "cuts": cuts, "flashes": flashes,
         "punches": punches, "highlight": hl, "emph": em, "overlays": ov, "broll": BROLL,
         "captionY": {"v1": 1200, "v2": 1200, "v5": 1200}.get(NAME, 1000)}  # primer plano en v1/v2/v5: subtítulos al pecho
json.dump(props, open(f"{JOB}/props.json", "w"), ensure_ascii=False)

# SFX (pinky_lib): whoosh on every cut and b-roll change, riser into the globe/catalog, sparkle on the first
# frame and on big yellow words, pop on each list bar, ka-ching on prices/money, typing on the URL. No music.
emw = {bare(x) for x in em}
em_t = [w[0] for w in W if bare(w[2]) in emw]
whoosh = sorted(set(cuts + flashes + [o["at"] for o in ov if o["type"] == "money"]) - set(FULL))
events = {"duration": round(DUR, 3), "whoosh": whoosh, "riser": FULL,
          "sparkle": [0.05] + em_t[:: 2],
          "pop": [i[0] for o in ov if o["type"] == "stack" for i in o["items"]],
          "cash": [o["at"] + 0.05 for o in ov if o["type"] in ("price", "money")],
          "type": [[o["at"] + 0.15, o["at"] + 1.2] for o in ov if o["type"] == "url"],
          "music": False, "sfx_db": -20}
json.dump(events, open(f"{JOB}/events.json", "w"))
print(f"{NAME}: {DUR:.1f}s, {len(ov)} gráficos, {len(cuts)} cortes, {len(flashes)} transiciones")
