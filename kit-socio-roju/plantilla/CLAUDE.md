# Notas para Claude · repositorio de Kevin Juárez (ROJU Consulting)

Kevin Juárez es socio de **ROJU Consulting** (Malinalco, Edo. Méx.) junto con **Pablo Knauth**.
Este repositorio es de Kevin. El de Pablo es `PabloKnauth/https-github.com-alesha-pro-tools`:
no subas cambios ahí salvo que Pablo lo pida.

## Marca ROJU (no cambiar sin preguntar)

- Nombre: ROJU Consulting. Lema: "Pensamos. Creamos. Crecemos." Wordmark: R azul, J naranja, CONSULTING debajo.
- Colores: azul noche `#071221` (dominante), azul ROJU `#1E46A0`, naranja `#E85D04` solo como acento,
  blanco `#FFFFFF`, soporte `#F4F6F9`.
- Tipografías: Montserrat (títulos) e Inter (texto). Minimalismo ejecutivo, alto contraste, sin emojis en interfaces.
- Responsables siempre escritos exactamente "Pablo Knauth" y "Kevin Juárez".
- Precios de referencia siempre con "desde"; nunca presentarlos como ofertas aprobadas.

## Marcas y nombres de clientes

Verificá estos nombres antes de ponerlos en subtítulos o gráficos; Whisper los transcribe mal.

- **Moto Roka Fix & Shop**: taller del cliente (Instagram `@motoroka_fixshop`). Whisper lo oye como "Motor Rock".
- **Liqui Moly**: Moto Roka es *centro de servicio oficial Liqui Moly*. Whisper lo oye como "Likimori".
  **No** es QJ Motor, aunque el letrero de neón QJ MOTOR aparezca de fondo.
- Otros: "balatas" (pastillas de freno), "llantas" (Whisper escribe "yantas").
- **Malinalco Mágico**: rentas vacacionales en Malinalco (`malinalcomagico.net`).

Al transcribir, pasá estos nombres en `initial_prompt` de faster-whisper. Si una palabra clave sale
con probabilidad baja, preguntale al usuario en vez de adivinar.

## Diseño web

1. Antes de diseñar, buscá 2–3 sitios de referencia del mismo giro y estudiá su estructura.
2. Definí colores, tipografías y espaciado con `ui-ux-pro-max`, respetando la marca del cliente.
3. Construí y revisá con Playwright (servidor `playwright` en `.mcp.json`): capturas a 390 px y 1366 px,
   sin desborde horizontal y sin errores de consola.
4. Pedí a un subagente una auditoría independiente (`/impeccable audit`) y corregí hasta que no queden errores.

## Sesiones en la nube (claude.ai/code)

- **Chromium**: no descargues navegadores; usá el de `/opt/pw-browsers` (verificá la versión con `ls /opt/pw-browsers`).
  Remotion: `--browser-executable=/opt/pw-browsers/chromium_headless_shell-<versión>/chrome-headless-shell-linux64/chrome-headless-shell`.
  HyperFrames: `export PUPPETEER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-<versión>/chrome-linux64/chrome`.
- **CDN dentro de Chrome**: el navegador de render no pasa por el proxy; bajá el paquete con `npm pack <pkg>@<versión>`
  y referenciá el archivo local.
- **Whisper**: Hugging Face está bloqueado. `pip install faster-whisper` funciona; el modelo *small* está en npm en
  cuatro partes (`npm pack @skillninja/shortmovie-telop-model-p0` … `-p3`), unir `model.bin.part0..3` en `model.bin`
  y comprobar contra `model.sha256`. Pasale el audio ya decodificado como array float32 de 16 kHz.
- El contenedor se borra tras un tiempo sin uso: guardá todo con commit y push.
- Nunca pidas claves en el chat: usá el formulario seguro de credenciales o los Secretos de red del entorno.
