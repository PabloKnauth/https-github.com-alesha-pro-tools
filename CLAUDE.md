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
