"""Genera la sección del catálogo de motos en index.html a partir de datos/motos.json.

Uso (desde la carpeta motoroka):  python3 herramientas/generar_catalogo.py

Para actualizar precios o agregar un modelo, edita datos/motos.json y vuelve a correr este script.
Las fotos de cada modelo viven en assets/motos/<slug>/ (NN.webp = ángulos en orden de giro,
portada.webp = foto de la tarjeta). Las fichas técnicas se cargan desde datos/motos.json al abrir la ventana.
"""
import html, json, os, re, unicodedata
from urllib.parse import quote

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
datos = json.load(open(os.path.join(RAIZ, 'datos', 'motos.json'), encoding='utf-8'))
motos = datos['motos']
WA = 'https://wa.me/527226665997?text='
e = lambda s: html.escape(str(s), quote=True)
peso = lambda n: f"${n:,.0f}"

def dato(m, *claves):
    for sec in m['ficha']:
        for etq, val in sec['filas']:
            if any(re.search(c, etq, re.I) for c in claves):
                return val
    return None

def corto(v, patron):
    if not v: return None
    m = re.search(patron, v.replace(',', ''), re.I)
    return m.group(0) if m else None

MARCAS = ['QJ Motor', 'Treck', 'Benda', 'Kove']
# grados de viscosidad y modelos sin partirse en dos renglones (guion no separable)
sin_corte = lambda t: re.sub(r'(\w)-(\w)', '\\1\u2011\\2', t)
TIPOS = ['Deportiva', 'Superdeportiva', 'Naked', 'Adventure', 'Cruiser', 'Bobber', 'Scooter', 'Urbana', 'Doble propósito', 'Trabajo', 'Cuatrimoto', 'Infantil', 'Vehículo comercial']
clave_marca = lambda s: s.lower().replace(' ', '')

tarjetas = []
for i, m in enumerate(motos):
    cc = corto(dato(m, r'^Cilindrada'), r'[\d.]+\s*cc')
    hp = corto(dato(m, r'^Potencia'), r'[\d.]+\s*hp')
    kg = corto(dato(m, r'^Peso'), r'[\d.]+\s*(kg|kilos)')
    if kg: kg = kg.replace('kilos', 'kg').replace('Kg', 'kg')
    specs = ''.join(f'<li>{e(x)}</li>' for x in (cc, hp, kg) if x)
    gira = m.get('modo') == '360'
    precio = (f'<span class="moto__especial">{peso(m["especial"])}</span><s class="moto__lista" aria-label="Precio de lista {peso(m["precio"])}">{peso(m["precio"])}</s>'
              if m['especial'] else f'<span class="moto__especial">{peso(m["precio"])}</span>')
    msg = quote(f'Hola Moto Roka, me interesa la {m["marca"]} {m["modelo"]}.')
    tarjetas.append(f'''        <li class="moto" data-marca="{clave_marca(m['marca'])}" data-tipo="{e(m['tipo'])}" data-precio="{m['especial'] or m['precio']}" data-i="{i}">
          <button class="moto__abrir" type="button" data-ficha="{i}" aria-haspopup="dialog">
            <span class="moto__foto"><img src="assets/motos/{m['slug']}/portada.webp" width="800" height="600" alt="{e(m['marca'])} {e(m['modelo'])}" loading="lazy" decoding="async"></span>
            <span class="moto__marca">{e(m['marca'])} · {e(m['tipo'])}</span>
            <span class="moto__nombre">{e(sin_corte(m['modelo']))}</span>
            <ul class="moto__specs" aria-label="Datos principales">{specs}</ul>
            <span class="moto__pie"><span class="moto__precio">{precio}</span><span class="moto__cta">{'Ficha y 360°' if gira else 'Ficha técnica'}<svg aria-hidden="true"><use href="#flecha"/></svg></span></span>
          </button>
          <a class="moto__wa" href="{WA}{msg}" target="_blank" rel="noopener" aria-label="Preguntar por la {e(m['modelo'])} por WhatsApp"><svg aria-hidden="true"><use href="#wa"/></svg></a>
        </li>''')

cuenta = {k: sum(1 for m in motos if m['marca'] == k) for k in MARCAS}
tipos_usados = [t for t in TIPOS if any(m['tipo'] == t for m in motos)]
seccion = f'''  <section class="seccion motos" id="motos" aria-labelledby="motos-h">
    <div class="envoltura">
      <div class="cabeza">
        <h2 id="motos-h" class="h2">{len(motos)} modelos, cuatro marcas</h2>
        <p class="cabeza__lado">Precio al público, ficha técnica completa, fotos y vista 360°. Pregunta por disponibilidad en piso y planes de financiamiento.</p>
      </div>
      <div class="filtros" data-filtros>
        <div class="filtros__marcas" role="group" aria-label="Filtrar por marca">
          <button type="button" aria-pressed="true" data-marca="todas">Todas <span>{len(motos)}</span></button>
{chr(10).join(f'          <button type="button" aria-pressed="false" data-marca="{clave_marca(k)}">{e(k)} <span>{v}</span></button>' for k, v in cuenta.items())}
        </div>
        <label class="filtros__tipo"><span class="sr">Tipo de moto</span>
          <select data-tipo>
            <option value="">Todos los tipos</option>
{chr(10).join(f'            <option>{e(t)}</option>' for t in tipos_usados)}
          </select>
        </label>
        <label class="filtros__orden"><span class="sr">Ordenar</span>
          <select data-orden>
            <option value="">Orden: destacadas</option>
            <option value="asc">Precio: menor a mayor</option>
            <option value="desc">Precio: mayor a menor</option>
          </select>
        </label>
      </div>
      <p class="filtros__resultado" data-resultado aria-live="polite">{len(motos)} modelos</p>
      <p class="filtros__vacio" data-vacio hidden>No hay modelos con esos filtros. <button class="enlace" type="button" data-quitar-filtros>Quitar filtros</button></p>
      <ul class="catalogo lista-corta" data-catalogo data-corto="8">
{chr(10).join(tarjetas)}
      </ul>
      <button class="btn btn--linea ver-mas" type="button" data-ver-mas="catalogo">Ver los {len(motos)} modelos</button>
      <div class="catalogo__pie">
        <p class="nota">{e(datos['vigencia'])} Sujetos a cambio sin previo aviso; confirma precio y disponibilidad por WhatsApp.</p>
        <a class="enlace" href="https://drive.google.com/file/d/1ViwTy-XhxOiL_FX8LOjT93GlyQnREPIM/view" target="_blank" rel="noopener">Catálogo Benda 2025 (PDF)<svg aria-hidden="true"><use href="#flecha"/></svg></a>
      </div>
    </div>
  </section>'''

p = os.path.join(RAIZ, 'index.html')
s = open(p, encoding='utf-8').read()
ini, fin = '<!-- CATALOGO:INICIO -->', '<!-- CATALOGO:FIN -->'
assert ini in s and fin in s, 'faltan las marcas del catálogo en index.html'
s = s[:s.index(ini) + len(ini)] + '\n' + seccion + '\n  ' + s[s.index(fin):]
open(p, 'w', encoding='utf-8').write(s)
print(f'{len(motos)} tarjetas generadas')


# ---------- Liqui Moly: productos para moto (datos/liquimoly.json) ----------
lm = json.load(open(os.path.join(RAIZ, 'datos', 'liquimoly.json'), encoding='utf-8'))


def resumen(t, limite=190):
    frases = re.split(r'(?<=[.!])\s+', t)
    out = ''
    for f in frases:
        if len(out) + len(f) > limite and out:
            break
        out = (out + ' ' + f).strip()
    return out


CATS = []
for x in lm:
    if x['categoria'] not in CATS:
        CATS.append(x['categoria'])
clave_cat = lambda c: re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', c).encode('ascii', 'ignore').decode().lower()).strip('-')
prods = []
for x in lm:
    msg = quote(f'Hola Moto Roka, ¿tienen {x["nombre"]} de Liqui Moly?')
    prods.append(
        f'        <li class="lm" data-cat="{clave_cat(x["categoria"])}">\n'
        f'          <span class="lm__foto"><img src="assets/liquimoly/{x["imagen"]}.webp" alt="{e(x["nombre"])}" loading="lazy" decoding="async"></span>\n'
        f'          <span class="lm__cat">{e(x["categoria"])}</span>\n'
        f'          <h3 class="lm__nombre">{e(sin_corte(x["nombre"].replace("Motorbike ", "")))}</h3>\n'
        f'          <p class="lm__texto">{e(resumen(x["texto"]))}</p>\n'
        f'          <a class="lm__cta" href="{WA}{msg}" target="_blank" rel="noopener" aria-label="Preguntar existencia de {e(x["nombre"])}">Preguntar<span class="lm__cta-mas"> existencia</span><svg aria-hidden="true"><use href="#flecha"/></svg></a>\n'
        f'        </li>')
botones = '\n'.join(
    f'          <button type="button" aria-pressed="false" data-cat="{clave_cat(c)}">{e(c)} <span>{sum(1 for x in lm if x["categoria"] == c)}</span></button>'
    for c in CATS)
seccion_lm = (
    '  <section class="seccion liquimoly" id="liquimoly" aria-labelledby="lm-h">\n'
    '    <div class="envoltura">\n'
    '      <div class="cabeza">\n'
    '        <h2 id="lm-h" class="h2">Liqui Moly para tu moto</h2>\n'
    '        <p class="cabeza__lado">Somos distribuidores autorizados: aceites, aditivos y productos de cuidado originales, hechos en Alemania. Los usamos en cada servicio y los vendemos en tienda.</p>\n'
    '      </div>\n'
    '      <div class="filtros" data-filtros-lm>\n'
    '        <div class="filtros__marcas" role="group" aria-label="Filtrar productos por tipo">\n'
    f'          <button type="button" aria-pressed="true" data-cat="todos">Todos <span>{len(lm)}</span></button>\n'
    f'{botones}\n'
    '        </div>\n'
    '      </div>\n'
    f'      <p class="filtros__resultado" data-resultado-lm aria-live="polite">{len(lm)} productos</p>\n'
    '      <ul class="lms lista-corta" data-lms data-corto="6">\n'
    + '\n'.join(prods) + '\n'
    '      </ul>\n'
    f'      <button class="btn btn--linea ver-mas" type="button" data-ver-mas="lms">Ver los {len(lm)} productos</button>\n'
    '      <p class="nota">Descripciones e imágenes oficiales de Liqui Moly. Pregunta por presentaciones y existencia en tienda.</p>\n'
    '    </div>\n'
    '  </section>')
s2 = open(p, encoding='utf-8').read()
a2, b2 = '<!-- LIQUIMOLY:INICIO -->', '<!-- LIQUIMOLY:FIN -->'
assert a2 in s2 and b2 in s2, 'faltan las marcas de Liqui Moly en index.html'
s2 = s2[:s2.index(a2) + len(a2)] + '\n' + seccion_lm + '\n  ' + s2[s2.index(b2):]
open(p, 'w', encoding='utf-8').write(s2)
print(f'{len(lm)} productos Liqui Moly generados')
