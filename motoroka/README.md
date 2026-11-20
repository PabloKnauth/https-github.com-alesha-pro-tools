# Moto Roka Fix & Shop — sitio web

Sitio estático (HTML, CSS y JS sin dependencias). Se publica tal cual en Netlify.

## Publicar en Cloudflare Pages
- Workers & Pages → Create → Pages → Connect to Git → este repositorio.
- **Production branch:** `sitio-marca-personal` · **Framework preset:** None · **Build command:** (vacío) · **Build output directory:** `motoroka`.
- Las cabeceras de caché están en `_headers`.

## Publicar en Netlify (alternativa)
- Nuevo sitio desde Git → este repositorio, rama `sitio-marca-personal`.
- **Base directory:** `motoroka` · **Build command:** (vacío) · **Publish directory:** `motoroka`.
- O bien arrastrar la carpeta `motoroka/` a https://app.netlify.com/drop.
- Al tener dominio, cambiar `og:image` en `index.html` por la URL absoluta (`https://<dominio>/assets/img/compartir.jpg`).

## Contenido
Textos, precios y medios salen del Instagram @motoroka_fixshop. Datos confirmados por el cliente: horario, WhatsApp 722 666 5997, ubicación en Google Maps, logotipos, Matt 250 y frases.

## Catálogo de motos
- Los datos viven en `datos/motos.json`: modelo, marca, tipo, precio público, precio especial del mes, ficha técnica y enlace al PDF original.
- Las fotos de cada modelo están en `assets/motos/<slug>/`: `00.webp`, `01.webp`… en orden de giro y `portada.webp` para la tarjeta.
  `modo: "360"` gira al arrastrar; `modo: "fotos"` muestra una galería.
- Para cambiar precios cada mes: edita `precio` y `especial` (o `null`) en `datos/motos.json`, actualiza `vigencia`
  y corre `python3 herramientas/generar_catalogo.py` desde esta carpeta. Las tarjetas de `index.html` se regeneran solas.
- Fuentes: carpetas de distribuidor de Kove, Treck, QJ Motor y Benda (fichas técnicas, fotos de estudio y listas de
  precios al público del 1 de noviembre de 2026).

## Medios
- `assets/vid/portada.mp4` (escritorio) y `portada-movil.mp4` (teléfono, vertical).
- `assets/vid/reel-*.mp4` con sonido para el visor; `vista-*.mp4` son vistas previas mudas de 6 s.
