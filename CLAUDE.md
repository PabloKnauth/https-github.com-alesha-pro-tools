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
