# Notas para Claude

Repositorio de herramientas de edición de video. Ver `KIT-EDICION.md` para el kit instalado.

## Marcas y nombres del cliente

Verificá estos nombres antes de ponerlos en subtítulos o gráficos; Whisper los transcribe mal.

- **Moto Roka Fix & Shop**: el taller del cliente (logo azul en la camisa del personal).
  Whisper lo oye como "Motor Rock".
- **Liqui Moly**: marca alemana de aceites y aditivos. Moto Roka es *centro de servicio oficial
  Liqui Moly*. Whisper lo oye como "Likimori". **No** es QJ Motor, aunque el letrero de neón
  QJ MOTOR aparezca de fondo en el local: no deduzcas la marca por lo que se ve en el video.
- Otros: "balatas" (pastillas de freno), "llantas" (Whisper escribe "yantas").

### Marca personal Pablo Knauth (videos propios del usuario)

Estilo definido por el usuario con dos imágenes de referencia; respetalo en todos sus videos:
- Persona recortada **a color natural** (preferencia actual del usuario; el B/N de las referencias lo
  descartó) con **borde de papel crema** irregular y sombra suave: `mi-reel/sfx/person_cutout.py --color`
  + modelo `u2net_human_seg`. **Sin gafas** sobre la cara salvo que lo pida.
- No dibujar personajes con copyright (p. ej. el traje o las garras de Wolverine): usar versiones
  originales genéricas (antifaz dominó, torso musculoso de caricatura).
- Fondo de **ondas** naranja `#f0532d` / rosa `#f49ac1` / amarillo `#f7c12e` / rojo `#e8442a` con textura
  de papel; también acuarela sobre crema como alternativa.
- **Garabatos amarillos** (corona, estrellas), recortes de papel rasgado con cinta, letra **Permanent Marker**
  (títulos) y **Caveat** (notas). Animación "a mano" a 12 fps.
- Plantilla: `mi-reel/src/PabloKnauth.tsx`. Efectos de sonido de papelería: `mi-reel/sfx/pablo_sfx.py`.
- Whisper oye "Knauth" como "Klauth" y "Claude" como "Klauth"/"cloud"; "prompts, skills y guías" sale mal.
  Pasá esos términos en `initial_prompt` y confirmá con el usuario las frases dudosas.

### Vestidos Pinky (cliente: anuncios de ropa de mujer a mayoreo)

Estilo tomado de 3 anuncios de referencia del usuario (ad_1, ad_2, ad_4; 18–25 s, 1080×1920):
- **Guion**: gancho con categorías/"¿buscas ropa de mujer a precio saldo?" → +500 modelos → "desde menos de
  $100" → para surtir/revender/iniciar tu negocio → envío a todo México → CTA "conoce el catálogo / compra
  ahora" con la URL `https://tienda.vestidospinky.com`. Ritmo rápido: un corte cada 1–2,5 s.
- **Subtítulos**: palabra por palabra, MAYÚSCULAS, sans geométrica muy negrita (tipo Montserrat/Poppins
  Black), blanco con sombra; frases clave sobre **barra amarilla `#f6dc3c`** que se barre de izquierda a
  derecha; las listas (VESTIDOS / BLUSAS / SUÉTERES / PLAYERAS) se apilan en barras amarillas; a la altura
  del pecho. Palabras fuertes (MAYOREO, TU NEGOCIO, 500) en amarillo grande con brillo.
- **Gráficos**: degradado negro en el 30 % inferior; precio en píldora verde neón con flecha verde
  dibujada ("$100"); billetes con flecha de subida; zoom del globo a México con bandera ("enviamos a todo
  México"); catálogo/web en pantalla curva 3D desplazándose; presentador en círculo (PiP) sobre B-roll
  de fábrica; URL tecleándose dentro de barra amarilla; destellos blancos y zoom en cortes.
- **Audio**: música de fondo enérgica constante (~154/77 BPM) unos 12 dB bajo la voz, *whoosh* en casi
  cada corte, máster ≈ −14 LUFS.
- **Datos reales de la tienda** (tienda.vestidospinky.com): ropa al mayoreo a precio de saldo, envíos a
  todo México, vestidos/blusas/partes bajas/conjuntos/niña/pijamas, remates y lotes surtidos, mezcla tallas y
  colores, pago con tarjeta/transferencia/OXXO, precios de mayoreo solo para clientes registrados (precios
  vistos $53–$145 c/u). Tipografía web: Jost. WhatsApp wa.me/525539384621, IG @vestidospinkymx,
  FB VestidosPinkyMX. No inventes precios ni cifras: usa solo lo que dice el video o la tienda.
- **Clips de stock** (Drive del cliente): iPhone **HDR HLG** → convertir a SDR (`person_cutout.py` ya lo
  hace; para clips sin recorte usar el mismo `zscale…tonemap=hable` a 100 nits). El presentador viste
  polo roja en el stock y negra en las referencias.

Al transcribir, pasá estos nombres en `initial_prompt` de faster-whisper. Si una palabra clave sale
con probabilidad baja, preguntale al usuario en vez de adivinar.

## Sesiones en la nube (claude.ai/code)

El contenedor tiene un proxy de red que bloquea algunos hosts. Lo que funciona:

- **Chromium**: no descargues navegadores. Remotion:
  `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`.
  HyperFrames: `export PUPPETEER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`
  (verificá la versión con `ls /opt/pw-browsers`).
- **CDN dentro de Chrome**: el navegador de render no pasa por el proxy, así que los `<script src="https://cdn…">`
  fallan (p. ej. `SUB_TIMELINE_SCRIPT_FAILURE` con GSAP). Bajá el paquete con `npm pack <pkg>@<versión>`
  y referenciá el archivo local.
- **Whisper**: Hugging Face y openaipublic están bloqueados. `pip install faster-whisper` funciona;
  el modelo *small* (CTranslate2 int8) está en npm en cuatro partes:
  `npm pack @skillninja/shortmovie-telop-model-p0` … `-p3`, unir `model.bin.part0..3` en `model.bin`
  y comprobar contra `model.sha256`. Pasale el audio ya decodificado como array float32 de 16 kHz
  (la versión de PyAV instalada no acepta rutas de archivo).
- Los archivos que el usuario sube viven fuera del repo; los entregables van al scratchpad o a `films/`.

## Ahorro de tokens (aplica siempre)

- **Modelos:** la sesión usa `opusplan` (Opus al planear, Sonnet al ejecutar). Delega lo mecánico (buscar,
  listar, renombrar, resumir, convertir, verificar) al agente `rapido` (Haiku). Usa `revisor-final` (Opus) una
  sola vez, al final, en entregables para clientes o código que se despliega. Nunca Opus para tareas simples.
- **Lecturas:** lee solo las líneas necesarias (offset/limit, `grep -n`), no archivos enteros ni salidas largas;
  filtra con `head`/`tail`. No repitas lecturas de lo que ya está en la conversación.
- **Imágenes:** pide capturas recortadas a lo relevante; para revisar video usa mosaicos pequeños (scale 360).
- **Respuestas:** breves; sin resúmenes de lo ya dicho ni listas de opciones que no se van a usar.
- **Sesiones:** una sesión por tema. Si una conversación se alarga, sugiere `/compact` o abrir una nueva.
- **Graphify:** sin hooks automáticos; usa `/graphify` o `graphify query` solo para preguntas de código.
