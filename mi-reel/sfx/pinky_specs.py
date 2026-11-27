"""Edit decisions for the Vestidos Pinky ads: builds the PinkyAd props and the SFX/music events per video.

Usage: python3 pinky_specs.py <job_dir> <name>   (job_dir holds prep/words.json and prep/cuts.json)
Writes job_dir/props.json (for `remotion render PinkyAd --props`) and job_dir/events.json (pinky_music.py).
Every overlay is anchored to a word of the transcript, so timings follow the real speech.
"""
import json, re, subprocess, sys

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
ov, punches, hl, em = [], [], [], []
BROLL = []

if NAME in ("v1", "v2"):   # Black Friday, presentador de rojo + B-roll (+ laptop en v1)
    bf = at("black")
    ov += [{"type": "big", "at": bf, "until": at("partir") - 0.05, "text": "BLACK\nFRIDAY", "size": 170, "y": 200}]
    ov += [{"type": "badge", "at": at("20"), "until": end("compra") + 0.2, "top": "BLACK FRIDAY", "big": "20%", "small": "DE DESCUENTO", "y": 140}]
    ov += [{"type": "price", "at": at("2000") - 0.1, "until": end("compra") + 0.25, "value": "$2,000", "label": "EN COMPRAS DESDE", "y": 1480}]
    ov += [{"type": "catalog", "at": at("catálogo") - 0.2, "until": end("actualizado") + 0.2, "image": "pinky/catalog.jpg", "caption": "CATÁLOGO ACTUALIZADO"}]
    ov += [{"type": "stack", "items": [[at("pijamas"), "PIJAMAS NUEVAS"]], "until": end("nuevas") + 0.6, "y": 420}]
    ov += [{"type": "money", "at": at("revender"), "until": min(DUR, end("ganancia") + 0.5), "label": "GANANCIA", "y": 1470}]
    punches = [[bf, 0.08], [at("20"), 0.1], [at("2000"), 0.06], [at("500"), 0.1], [at("mayoreo"), 0.07]]
    hl = ["friday", "domingo", "descuento", "almacén", "negocio", "revender", "méxico", "pedido"]
    em = ["500", "mayoreo"]
    if NAME == "v1":
        ov += [{"type": "globe", "at": at("envíos") - 0.1, "until": end("méxico") + 0.15, "caption": "ENVÍOS A TODO MÉXICO"}]
        ov += [{"type": "url", "at": at("haz") - 0.2, "until": DUR, "text": URL, "y": 1480}]
        punches += [[at("entra"), 0.08]]
    else:
        ov += [{"type": "url", "at": max(end("ganancia") - 0.9, at("revender") + 0.6), "until": DUR, "text": URL, "y": 300}]

elif NAME == "v3":         # voz en off sobre B-roll del almacén: widgets grandes
    ov += [{"type": "stack", "items": [[at("ropa"), "ROPA DE MUJER"], [at("mayoreo"), "A PRECIO DE MAYOREO"]], "until": at("pues") - 0.05, "y": 520}]
    ov += [{"type": "money", "at": at("revenderlo"), "until": at("pues") + 0.1, "label": "GANANCIAS", "y": 1180}]
    ov += [{"type": "big", "at": at("black") - 0.1, "until": at("tienes") - 0.05, "text": "BLACK\nFRIDAY", "size": 170, "y": 260}]
    ov += [{"type": "badge", "at": at("20") - 0.1, "until": end("pesos") + 0.25, "top": "BLACK FRIDAY", "big": "20%", "small": "DE DESCUENTO", "y": 160}]
    ov += [{"type": "price", "at": at("2000") - 0.15, "until": end("pesos") + 0.25, "value": "$2,000", "label": "EN COMPRAS ARRIBA DE", "y": 1200}]
    ov += [{"type": "globe", "at": at("envíos") - 0.25, "until": end("méxico") + 0.2, "caption": "ENVÍOS A TODO MÉXICO"}]
    ov += [{"type": "big", "at": at("500"), "until": end("diferentes") + 0.3, "text": "+500\nMODELOS", "size": 160, "y": 300}]
    ov += [{"type": "money", "at": at("ingreso"), "until": end("extra") + 0.4, "label": "INGRESO EXTRA", "y": 1180}]
    ov += [{"type": "catalog", "at": at("así") - 0.1, "until": end("carrito") + 0.2, "image": "pinky/catalog.jpg", "caption": "AGREGA A TU CARRITO"}]
    ov += [{"type": "steps", "items": [[at("tarjeta"), "Tarjeta de débito"], [at("crédito"), "Crédito"], [at("efectivo"), "Pago en efectivo"]], "until": at("enviamos") + 0.2, "y": 300}]
    ov += [{"type": "url", "at": at("enviamos") - 0.2, "until": DUR, "text": URL, "y": 1300}]
    punches = [[at("black"), 0.08], [at("20"), 0.1], [at("500"), 0.1], [at("efectivo"), 0.06]]
    hl = ["negocio", "domingo", "descuento", "surtirla", "revenderla", "saldo", "surtirlo", "casa"]
    em = ["mayoreo"]

elif NAME == "v4":         # el gag del jefe + tutorial de compra en la laptop
    ov += [{"type": "emoji", "at": at("gritado"), "until": at("bueno") - 0.05, "text": "😡", "x": 830, "y": 70}]
    ov += [{"type": "big", "at": at("harta"), "until": at("bueno") - 0.05, "text": "¿HARTA?", "size": 170, "y": 300}]
    ov += [{"type": "big", "at": at("sé"), "until": at("contamos") - 0.05, "text": "SÉ TU\nPROPIA JEFA", "size": 140, "y": 260}]
    ov += [{"type": "big", "at": at("500"), "until": at("pijamas") - 0.05, "text": "+500\nMODELOS", "size": 160, "y": 260}]
    ov += [{"type": "stack", "items": [[at("pijamas"), "PIJAMAS"], [at("vestidos"), "VESTIDOS"], [at("blusas"), "BLUSAS"]], "until": at("ahora") + 0.3, "y": 420}]
    ov += [{"type": "stack", "items": [[at("mayoreo"), "PRECIOS DE MAYOREO"], [at("descuentos"), "DESCUENTOS"], [at("promociones"), "PROMOCIONES"]], "until": at("haz") + 0.4, "y": 360}]
    ov += [{"type": "url", "at": at("entra") - 0.1, "until": at("sencillo") + 0.3, "text": URL, "y": 1300}]
    ov += [{"type": "steps", "items": [[at("prenda", 1, at("oprimes") - 0.1), "Elige la prenda"], [at("talla"), "La talla"], [at("cantidad"), "La cantidad"], [at("carrito"), "Al carrito"]], "until": at("descuentos", 1, at("carrito")) + 0.6, "y": 220}]
    ov += [{"type": "stamp", "at": at("renuncia"), "until": DUR, "text": "¡RENUNCIA!", "y": 260}]
    punches = [[at("gritado"), 0.08], [at("harta"), 0.1], [at("jefa"), 0.08], [at("500"), 0.1], [at("renuncia"), 0.12]]
    hl = ["pinky", "negocio", "boutique", "casa", "sencillo", "carrito", "compra", "empresa"]
    em = []

elif NAME == "v5":         # anuncio propio armado con el stock (presentador de rojo + B-roll + laptop)
    ov += [{"type": "stack", "items": [[at("vestidos"), "VESTIDOS"], [at("blusas"), "BLUSAS"]], "until": at("almacén") + 0.3, "y": 380}]
    ov += [{"type": "big", "at": at("500"), "until": at("de", 1, at("tenemos", 2)) - 0.02, "text": "+500\nMODELOS", "size": 170, "y": 260}]
    ov += [{"type": "stack", "items": [[at("blusas", 2), "BLUSAS"], [at("vestidos", 2), "VESTIDOS"], [at("suéteres"), "SUÉTERES"], [at("pijamas"), "PIJAMAS"]], "until": at("para", 2) - 0.05, "y": 620}]
    ov += [{"type": "money", "at": at("ingreso"), "until": end("extra") + 0.1, "label": "INGRESO EXTRA", "y": 1440}]
    ov += [{"type": "stack", "items": [[at("calidad", 2), "PRENDAS DE CALIDAD"], [at("completamente"), "COMPLETAMENTE NUEVAS"]], "until": end("nuevas") + 0.1, "y": 560}]
    ov += [{"type": "globe", "at": at("te", 2) - 0.05, "until": end("casa") + 0.05, "caption": "TE LO ENVIAMOS A CASA"}]
    ov += [{"type": "url", "at": at("tienda") - 0.1, "until": DUR, "text": URL, "y": 1430}]
    BROLL = [{"src": "pinky/v5/aisles.mp4", "at": at("de", 1, at("tenemos", 2)), "until": at("para", 2) - 0.05, "from": 0, "pip": True},
             {"src": "pinky/v5/racks.mp4", "at": at("todo"), "until": end("nuevas") + 0.05, "from": 0, "pip": False},
             {"src": "pinky/v5/laptop.mp4", "at": at("así") - 0.02, "until": DUR, "from": 0.5, "pip": True}]
    punches = [[at("ropa"), 0.06], [at("mayoreo"), 0.08], [at("500"), 0.1], [at("negocio", 2), 0.06]]
    hl = ["calidad", "almacén", "negocio", "emprender", "pedido"]
    em = ["mayoreo"]

props = {"clip": CLIP, "duration": round(DUR, 3), "words": W, "cuts": sorted(set([round(c, 2) for c in SCENES + JUMPS])),
         "punches": punches, "highlight": hl, "emph": em, "overlays": ov, "broll": BROLL,
         "captionY": {"v1": 1310, "v2": 1310, "v5": 1310}.get(NAME, 980)}  # primer plano en v1/v2: subtítulos al pecho
json.dump(props, open(f"{JOB}/props.json", "w"), ensure_ascii=False)

# SFX: whoosh on cuts and on full-screen/big overlays, pop on stacked items, cash on prices, hit on badges/stamps
whoosh = sorted(set(props["cuts"] + [o["at"] for o in ov if o["type"] in ("globe", "catalog", "big", "money")] + [b["at"] for b in BROLL]))
pops = [i[0] for o in ov if o["type"] in ("stack", "steps") for i in o["items"]] + [o["at"] for o in ov if o["type"] == "emoji"]
events = {"duration": round(DUR, 3), "whoosh": whoosh, "pop": pops,
          "cash": [o["at"] + 0.1 for o in ov if o["type"] in ("price", "money")],
          "hit": [o["at"] for o in ov if o["type"] in ("badge", "stamp")],
          "type": [[o["at"] + 0.15, o["at"] + 1.2] for o in ov if o["type"] == "url"], "music_db": -43, "sfx_db": -20}  # música ~12 dB bajo la voz con --sfx-db 0
json.dump(events, open(f"{JOB}/events.json", "w"))
print(f"{NAME}: {DUR:.1f}s, {len(ov)} gráficos, {len(props['cuts'])} cortes, {len(punches)} acercamientos")
