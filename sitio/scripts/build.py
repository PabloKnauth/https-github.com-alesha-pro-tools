#!/usr/bin/env python3
"""Construye el sitio: contenido/*.md -> recursos/*.html + recursos/pdf/*.pdf + assets/js/recursos.js + index.html

Uso (desde la carpeta sitio/):
    python3 scripts/build.py          # páginas + PDF
    python3 scripts/build.py --sin-pdf
    python3 scripts/build.py --pago   # productos de pago: ../productos-pago/contenido -> ../productos-pago/pdf
Requiere: pip install markdown pyyaml   ·   PDF: Node.js + playwright
"""
import html, json, math, re, subprocess, sys, unicodedata
from pathlib import Path

import markdown
import yaml

RAIZ = Path(__file__).resolve().parent.parent
CONTENIDO = RAIZ / "contenido"
SALIDA = RAIZ / "recursos"
SPRITE = (RAIZ / "scripts" / "sprite.svg").read_text(encoding="utf-8")


def leer_config():
    txt = (RAIZ / "assets/js/config.js").read_text(encoding="utf-8")
    def campo(n, defecto=""):
        m = re.search(r'\b%s:\s*"([^"]*)"' % n, txt)
        return m.group(1) if m else defecto
    return {"nombre": campo("nombre", "Tu marca"), "instagram": campo("instagram"), "kick": campo("kick"), "dominio": campo("dominio", "tudominio.com")}


CFG = leer_config()

PALETA = {
    "tomato": ("var(--tomato)", "var(--pink)", "var(--mustard)"),
    "pink": ("var(--pink)", "var(--mustard)", "var(--tomato)"),
    "mustard": ("var(--mustard)", "var(--tomato)", "var(--pink)"),
    "moss": ("var(--moss)", "var(--mustard)", "var(--pink)"),
}


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def ondas_portada(color):
    a, b, c = PALETA.get(color, PALETA["tomato"])
    return (
        '<svg class="portada__ondas" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
        f'<rect width="1200" height="800" fill="{a}"/>'
        f'<path fill="{b}" d="M640 0 C780 120 560 260 720 400 S900 660 760 800 L1010 800 C1150 660 920 520 1040 400 S880 120 1000 0 Z"/>'
        f'<path fill="{c}" d="M740 0 C860 130 680 260 820 400 S980 660 880 800 L940 800 C1060 660 860 520 960 400 S820 130 920 0 Z"/>'
        f'<path fill="{b}" d="M0 560 C140 520 220 640 380 610 S600 700 720 800 L0 800 Z"/>'
        f'<path fill="{c}" d="M0 650 C120 630 210 720 330 700 S480 760 560 800 L0 800 Z"/>'
        "</svg>"
    )


def convertir(md):
    lineas = re.sub(r"_{6,}", "%%LINEA%%", md)
    cuerpo = markdown.markdown(lineas, extensions=["tables", "fenced_code", "sane_lists"])
    n = {"p": 0}

    def prompt(m):
        n["p"] += 1
        return (f'<figure class="prompt"><figcaption>prompt {n["p"]:02d}</figcaption>'
                f'<pre>{m.group(1).rstrip()}</pre><button class="copiar" type="button">Copiar</button></figure>')

    cuerpo = re.sub(r'<pre><code class="language-prompt">(.*?)</code></pre>', prompt, cuerpo, flags=re.S)
    cuerpo = re.sub(r'<pre><code class="language-codigo">(.*?)</code></pre>',
                    r'<div class="codigo"><pre><code>\1</code></pre><button class="copiar" type="button">Copiar</button></div>', cuerpo, flags=re.S)
    cuerpo = re.sub(r"<blockquote>\s*(.*?)\s*</blockquote>",
                    r'<aside class="nota"><svg viewBox="0 0 100 100" aria-hidden="true"><use class="doodle" href="#g-estrella"/></svg>\1</aside>', cuerpo, flags=re.S)
    cuerpo = cuerpo.replace("<li>[ ] ", '<li class="check">').replace("<li>\n<p>[ ] ", '<li class="check">\n<p>')
    cuerpo = re.sub(r"<table>", '<div class="tabla"><table>', cuerpo).replace("</table>", "</table></div>")
    cuerpo = cuerpo.replace("%%LINEA%%", '<span class="linea"></span>')

    indice = []
    def h2(m):
        t = m.group(1); i = slugify(re.sub("<[^>]+>", "", t))
        indice.append((i, re.sub("<[^>]+>", "", t)))
        return f'<h2 id="{i}">{t}</h2>'
    cuerpo = re.sub(r"<h2>(.*?)</h2>", h2, cuerpo)
    return cuerpo, indice, n["p"]


PLANTILLA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{titulo} · {nombre}</title>
<meta name="description" content="{subtitulo}">
<meta property="og:title" content="{titulo}">
<meta property="og:image" content="https://{dominio}/assets/img/banner.jpg">
<link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../assets/css/fuentes.css">
<link rel="stylesheet" href="../assets/css/base.css">
<link rel="stylesheet" href="../assets/css/doc.css">
<style>
@page {{ size: A4; margin: 16mm 16mm 18mm;
  @bottom-left {{ content: "{nombre} · {dominio}"; font: 700 8pt Archivo, sans-serif; color: #5F5347; letter-spacing: .06em; text-transform: uppercase; }}
  @bottom-right {{ content: counter(page); font: 400 11pt Shrikhand, serif; color: #EC4A27; }} }}
@page :first {{ margin: 0; @bottom-left {{ content: none; }} @bottom-right {{ content: none; }} }}
</style>
</head>
<body style="--c:var(--{color})">
{sprite}
<header class="barra">
  <div class="wrap barra__in">
    <a class="barra__volver" href="../index.html#biblioteca">← Biblioteca</a>
    <a class="barra__marca marker" href="../index.html">{nombre}</a>
    <a class="btn btn--sm btn--mustard" href="pdf/{slug}.pdf" download>Descargar PDF</a>
  </div>
</header>

<section class="portada">
  {ondas}
  <svg class="portada__d" viewBox="0 0 100 100" aria-hidden="true"><use class="doodle" href="#g-{garabato}"/></svg>
  <div class="wrap portada__in">
    <div class="portada__txt">
      <p class="portada__tipo marker">{tipo}</p>
      <h1 class="display">{titulo}</h1>
      <p class="portada__sub">{subtitulo}</p>
      <ul class="portada__meta"><li>{nivel}</li><li>{minutos} min de lectura</li>{extra}</ul>
      <p class="portada__autor marker">por {nombre}{ig}</p>
    </div>
    <figure class="recorte portada__foto"><img src="../assets/img/retrato-sm.jpg" width="560" height="747" alt="{nombre}"></figure>
  </div>
</section>

<main class="wrap">
  <nav class="indice" aria-labelledby="indice-t">
    <h2 class="indice__t marker" id="indice-t">En este recurso</h2>
    <ol>{indice}</ol>
  </nav>
  <article class="doc">
{cuerpo}
  </article>
</main>

<footer class="doc-pie">
  <div class="wrap doc-pie__in">
    <p class="display doc-pie__marca">{nombre}</p>
    <p>{pie}</p>
  </div>
</footer>

<div class="compuerta" id="compuerta" hidden>
  <div class="compuerta__caja">
    <p class="marker" style="color:var(--tomato-texto);margin:0 0 6px">recurso gratis</p>
    <h2 class="display">Desbloquéalo en un toque</h2>
    <p>Este recurso es gratis para quienes me siguen en Instagram. Vuelve a la biblioteca, sígueme y se abrirá al instante.</p>
    <a class="btn btn--tomato" href="../index.html?r={slug}#biblioteca">Desbloquear gratis</a>
  </div>
</div>
<script src="../assets/js/recurso.js"></script>
</body>
</html>
"""


PAGO = RAIZ.parent / "productos-pago"


def construir(fuente=CONTENIDO, prefijo="", pago=False):
    SALIDA.mkdir(exist_ok=True); (SALIDA / "pdf").mkdir(exist_ok=True)
    datos = []
    ig = f" · @{CFG['instagram']}" if CFG["instagram"] else ""
    if pago:
        pie = f"Licencia de uso personal · No redistribuir · <strong>{html.escape(CFG['dominio'])}</strong>"
    else:
        pie = f"Más recursos gratis en <strong>{html.escape(CFG['dominio'])}</strong>" + (f" · Instagram <strong>@{html.escape(CFG['instagram'])}</strong>" if CFG["instagram"] else "")
    for md in sorted(fuente.glob("*.md")):
        crudo = md.read_text(encoding="utf-8")
        _, fm, cuerpo_md = crudo.split("---", 2)
        meta = yaml.safe_load(fm)
        slug = prefijo + md.stem
        cuerpo, indice, nprompts = convertir(cuerpo_md)
        palabras = len(re.sub("<[^>]+>", " ", cuerpo).split())
        minutos = max(3, math.ceil(palabras / 180))
        extra = f"<li>{nprompts} prompts</li>" if nprompts >= 3 else ""
        e = lambda s: html.escape(str(s), quote=True)
        pagina = PLANTILLA.format(
            titulo=e(meta["titulo"]), subtitulo=e(meta["subtitulo"]), tipo=e(meta["tipo"]), nivel=e(meta["nivel"]),
            color=meta["color"], garabato=meta["garabato"], slug=slug, minutos=minutos, extra=extra,
            nombre=e(CFG["nombre"]), dominio=e(CFG["dominio"]), ig=e(ig), pie=pie,
            sprite=SPRITE, ondas=ondas_portada(meta["color"]), cuerpo=cuerpo,
            indice="".join(f'<li><a href="#{i}">{html.escape(t)}</a></li>' for i, t in indice),
        )
        (SALIDA / f"{slug}.html").write_text(pagina, encoding="utf-8")
        datos.append({
            "slug": slug, "titulo": meta["titulo"], "subtitulo": meta["subtitulo"], "tipo": meta["tipo"],
            "color": meta["color"], "garabato": meta["garabato"], "nivel": meta["nivel"], "orden": meta.get("orden", 99),
            "minutos": minutos, "prompts": nprompts, "paginas": 0,
            "claves": " ".join(t for _, t in indice),
        })
        print(f"  ✓ recursos/{slug}.html  ({nprompts} prompts, {minutos} min)")
    return datos


def escribir_datos(datos):
    (RAIZ / "assets/js/recursos.js").write_text(
        "/* Generado por scripts/build.py — no editar a mano */\nwindow.RECURSOS = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8")


def escribir_index():
    t = (RAIZ / "scripts/plantilla-index.html").read_text(encoding="utf-8")
    for k in ("nombre", "instagram", "kick", "dominio"):
        t = t.replace("{{%s}}" % k, html.escape(CFG[k], quote=True))
    t = t.replace("{{sprite}}", SPRITE)
    (RAIZ / "index.html").write_text(t, encoding="utf-8")
    print("  ✓ index.html")


def escribir_favicon():
    (RAIZ / "assets/img/favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#EC4A27"/>'
        '<path d="M50 16 L58 40 L84 41 L63 56 L71 81 L50 66 L29 81 L37 56 L16 41 L42 40 Z" fill="#F4B71F" stroke="#17130F" stroke-width="5" stroke-linejoin="round"/></svg>',
        encoding="utf-8")


def generar_pdf(slugs):
    r = subprocess.run(["node", str(RAIZ / "scripts/pdf.js"), str(RAIZ)] + slugs, capture_output=True, text=True)
    sys.stderr.write(r.stderr)
    if r.returncode != 0:
        sys.exit("Falló la generación de PDF")
    return json.loads(r.stdout.strip().splitlines()[-1])


def construir_pago():
    """Los productos de pago se generan fuera de la web pública y se borran sus HTML temporales."""
    datos = construir(PAGO / "contenido", prefijo="_pago-", pago=True)
    paginas = generar_pdf([d["slug"] for d in datos])
    (PAGO / "pdf").mkdir(exist_ok=True)
    for d in datos:
        nombre = d["slug"][len("_pago-"):]
        (SALIDA / "pdf" / f"{d['slug']}.pdf").replace(PAGO / "pdf" / f"{nombre}.pdf")
        (SALIDA / f"{d['slug']}.html").unlink()
        print(f"  ✓ productos-pago/pdf/{nombre}.pdf  ({paginas.get(d['slug'], 0)} págs)")


if __name__ == "__main__":
    print(f"Marca: {CFG['nombre']} · @{CFG['instagram']} · {CFG['dominio']}")
    if "--pago" in sys.argv:
        construir_pago(); print("Listo."); sys.exit()
    datos = construir()
    escribir_favicon(); escribir_index()
    if "--sin-pdf" not in sys.argv:
        paginas = generar_pdf([d["slug"] for d in datos])
        for d in datos:
            d["paginas"] = paginas.get(d["slug"], 0)
            print(f"  ✓ recursos/pdf/{d['slug']}.pdf  ({d['paginas']} págs)")
    escribir_datos(datos)
    print("Listo.")
