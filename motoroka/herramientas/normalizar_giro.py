"""Iguala la escala de los fotogramas de cada moto en modo 360: lienzo común de 1200x900,
misma altura para todos (la que permite que el fotograma más ancho quepa), centrados.

Uso (desde la carpeta motoroka):  python3 herramientas/normalizar_giro.py
Es idempotente: un fotograma ya normalizado (1200x900) se recorta a su contenido antes de recalcular.
"""
import json, os
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, MARGEN = 1200, 900, 0.92
datos = json.load(open(os.path.join(RAIZ, 'datos', 'motos.json'), encoding='utf-8'))
for m in datos['motos']:
    if m.get('modo') != '360':
        continue
    d = os.path.join(RAIZ, 'assets', 'motos', m['slug'])
    rutas = [os.path.join(d, f'{k:02d}.webp') for k in range(m['giro'])]
    ims = []
    for r in rutas:
        im = Image.open(r).convert('RGBA')
        bb = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        ims.append(im.crop(bb) if bb else im)
    alto = min(H * MARGEN, min(W * MARGEN * im.size[1] / im.size[0] for im in ims))
    for r, im in zip(rutas, ims):
        ancho = round(alto * im.size[0] / im.size[1])
        x = im.resize((ancho, round(alto)), Image.LANCZOS)
        lienzo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        lienzo.alpha_composite(x, ((W - ancho) // 2, H - round(alto) - round(H * 0.04)))  # apoyadas en el mismo "piso"
        lienzo.save(r, 'WEBP', quality=80, method=4)
    print(m['slug'], 'altura', round(alto))
