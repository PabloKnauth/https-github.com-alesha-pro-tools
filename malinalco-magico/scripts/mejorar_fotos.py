#!/usr/bin/env python3
"""Mejora y puntúa todas las fotos de Malinalco Mágico.
Uso: python3 procesar.py <scratchpad> <salida_staging>
"""
import sys, os, glob, json
import numpy as np, cv2
from PIL import Image, ImageDraw

S, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
CASAS = {  # rango de números de foto por casa (ronda 1 y 2)
    "quinta-amate": (1406, 1423), "casa-cielo": (1425, 1447), "puente-de-dios": (1449, 1468),
    "casa-arcadia": (1470, 1482), "los-morales": (1484, 1507), "depa-mali-2": (1509, 1518),
    "los-angeles": (1520, 1536), "casa-blanca": (1538, 1560), "casa-bachi": (1564, 1574),
    "paso-de-agua": (1576, 1595), "casa-colibri": (1597, 1615), "casa-rosa": (1617, 1626),
    "casa-centro": (1628, 1640),
}
fotos = {}
for f in glob.glob(S + "/mm-zip*/**/*.JPG", recursive=True):
    if "__MACOSX" in f: continue
    base = os.path.basename(f)[4:-4]          # "1450" o "1477 2"
    n = int(base.split()[0])
    for casa, (a, b) in CASAS.items():
        if a <= n <= b: fotos.setdefault(casa, []).append((base, f))

sr = cv2.dnn_superres.DnnSuperResImpl_create(); sr.readModel(S + "/sr/FSRCNN_x2.pb"); sr.setModel("fsrcnn", 2)

def mejorar(bgr):
    bgr = cv2.fastNlMeansDenoisingColored(bgr, None, 2, 2, 7, 21)          # artefactos JPEG, suave
    bgr = sr.upsample(bgr)                                                   # superresolución ×2
    lab = cv2.cvtColor(bgr.astype(np.float32) / 255.0, cv2.COLOR_BGR2LAB)    # L 0-100, a/b con signo
    L = lab[..., 0]
    lo, hi = np.percentile(L, 0.5), np.percentile(L, 99.6)
    lo, hi = min(lo, 7.0), max(hi, 93.0)
    L = np.clip((L - lo) * 100.0 / (hi - lo), 0, 100)
    m = L.mean() / 100.0
    if m < 0.45: L = 100.0 * (L / 100.0) ** (0.84 + 0.36 * m)               # levantar sombras en fotos oscuras
    L16 = (L * 655.35).astype(np.uint16)                                     # 16 bits: sin bandas
    cla = cv2.createCLAHE(clipLimit=1.4, tileGridSize=(8, 8)).apply(L16).astype(np.float32) / 655.35
    detalle = cv2.GaussianBlur(cv2.Laplacian(cv2.GaussianBlur(L, (0, 0), 1.5), cv2.CV_32F), (0, 0), 3)
    peso = np.clip(np.abs(detalle) * 4.0, 0, 1) * 0.35                        # contraste local solo donde hay textura
    lab[..., 0] = L * (1 - peso) + cla * peso
    for c in (1, 2):                                                          # balance de blancos muy leve
        desv = float(lab[..., c].mean())
        if abs(desv) > 4: lab[..., c] -= np.clip(desv, -5, 5) * 0.3
    out = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    hsv = cv2.cvtColor(np.clip(out, 0, 1), cv2.COLOR_BGR2HSV)
    s_ = hsv[..., 1]
    hsv[..., 1] = np.clip(s_ + (1 - s_) * s_ * 0.3, 0, 1)                     # viveza
    out = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    blur = cv2.GaussianBlur(out, (0, 0), 1.0)
    bordes = np.clip(np.abs(out - blur).max(axis=2, keepdims=True) * 18.0, 0, 1)
    out = out + (out - blur) * 0.3 * bordes                                   # enfoque solo en bordes
    out = out + np.random.default_rng(7).normal(0, 0.0022, out.shape).astype(np.float32)   # grano imperceptible
    return (np.clip(out, 0, 1) * 255.0 + 0.5).astype(np.uint8)

def puntuar(bgr):
    hsv = cv2.cvtColor(cv2.resize(bgr, (240, 320)), cv2.COLOR_BGR2HSV)
    H, Sv, V = hsv[..., 0].astype(int), hsv[..., 1] / 255.0, hsv[..., 2] / 255.0
    arriba = slice(0, 110)
    cielo = ((H[arriba] >= 95) & (H[arriba] <= 125) & (Sv[arriba] > .2) & (V[arriba] > .5)).mean()
    alberca = ((H >= 80) & (H <= 100) & (Sv > .3) & (V > .45)).mean()
    verde = ((H >= 35) & (H <= 80) & (Sv > .3) & (V > .25)).mean()
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    nitidez = min(cv2.Laplacian(g, cv2.CV_64F).var() / 900.0, 1.0)
    rg = bgr[..., 2].astype(float) - bgr[..., 1]; yb = 0.5 * (bgr[..., 2].astype(float) + bgr[..., 1]) - bgr[..., 0]
    color = min((np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)) / 90.0, 1.0)
    luz = 1 - abs(V.mean() - 0.6) * 1.6
    return round(3.0 * min(alberca * 6, 1) + 2.0 * min(cielo * 3, 1) + 1.0 * min(verde * 3, 1) + 0.8 * color + 0.5 * nitidez + 0.6 * luz, 3)

res = {}
for casa in CASAS:
    os.makedirs(f"{OUT}/{casa}", exist_ok=True); res[casa] = []
    for base, f in sorted(fotos.get(casa, [])):
        bgr = cv2.imread(f)                     # aplica la orientación EXIF
        sc = puntuar(bgr)
        out = mejorar(bgr)
        dst = f"{OUT}/{casa}/{base.replace(' ', '_')}.png"
        cv2.imwrite(dst, out)
        res[casa].append({"foto": base, "score": sc, "archivo": dst, "tam": [out.shape[1], out.shape[0]]})
    res[casa].sort(key=lambda x: -x["score"])
    print(casa, len(res[casa]), flush=True)
json.dump(res, open(OUT + "/puntuaciones.json", "w"), indent=1)

# hojas de contacto por casa, en orden de puntuación
for casa, items in res.items():
    TW, TH, COLS = 300, 300, 6
    filas = (len(items) + COLS - 1) // COLS
    hoja = Image.new("RGB", (COLS * TW, filas * (TH + 20)), "white"); d = ImageDraw.Draw(hoja)
    for i, it in enumerate(items):
        im = Image.open(it["archivo"]).convert("RGB"); im.thumbnail((TW - 6, TH - 6))
        x, y = (i % COLS) * TW, (i // COLS) * (TH + 20)
        hoja.paste(im, (x + (TW - im.width) // 2, y))
        d.text((x + 4, y + TH + 4), f"{i+1}. {it['foto']}  ({it['score']})", fill="black")
    hoja.save(f"{OUT}/hoja-{casa}.jpg", quality=78)
print("listo")
