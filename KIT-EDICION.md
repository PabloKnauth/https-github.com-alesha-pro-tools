# Kit de edición de video con Claude

Instalado a partir de la guía *36 Estilos de Edición en Claude*. Todo lo que está en
`.claude/skills/` se carga solo en cualquier sesión de Claude Code abierta en este repositorio,
en la nube o en tu computadora.

## Qué hay instalado

| Herramienta | Dónde | Cómo se usa |
|---|---|---|
| **Remotion** (12 skills oficiales) | Plugin de tu cuenta de Claude | `/remotion:remotion-create`, `/remotion:remotion-studio`, `/remotion:remotion-render`, `/remotion:remotion-docs`, `/remotion:remotion-captions`… |
| **Proyecto Remotion** (plantilla Blank, 1080×1920 a 30 fps) | `mi-reel/` | Copiá tu clip a `mi-reel/public/` y pedí el estilo |
| **HyperFrames** (HeyGen) | `.claude/skills/hyperframes*`, `media-use`, `remotion-to-hyperframes`, `figma`, `slideshow`, `reverse-any-video` | `/hyperframes` + lo que querés crear |
| **Edición de video real** (FFmpeg) | `.claude/skills/video-editing` | Cortes, silencios, 9:16, normalizar audio, cambios de escena |

La guía avisa que Remotion se instala *una sola vez* (skills o plugin). Como el plugin ya está activo
en tu cuenta, no se duplicó como skill de proyecto.

## Usarlo en tu computadora

```bash
git clone https://github.com/pabloknauth/https-github.com-alesha-pro-tools.git
cd https-github.com-alesha-pro-tools
# Requisitos: Node.js 22+ (nodejs.org) y FFmpeg
#   Mac:     brew install ffmpeg
#   Windows: winget install Gyan.FFmpeg
cd mi-reel && npm install
npm run dev          # Remotion Studio (vista previa)
# En otra terminal, en la carpeta del repo:
claude
```

## Efectos de sonido

`mi-reel/sfx/moto_roka_sfx.py` sintetiza efectos (whoosh, pop, notificación, golpe, checks,
teclado, envío de mensaje, acorde de éxito) sin bancos de sonido de terceros, sincronizados con una
línea de tiempo editable. Se mezclan sobre el video sin recodificar la imagen; el comando está en el
encabezado del script. Requiere Python con `numpy` y `scipy`.

`mi-reel/sfx/audio_master.py` limpia y masteriza el audio: reducción de ruido espectral con perfil
tomado de las pausas, EQ de voz, de-esser, compresor, efectos atenuados bajo la voz (*ducking*) y
normalización a −14 LUFS / −1 dBTP, el estándar para Reels y TikTok. Requiere además `noisereduce`.
Para clips con varias tomas o grabados más fuerte, usá `--scenes` (iguala el nivel de cada toma),
`--max-gap-db` (solo pausas realmente silenciosas como perfil de ruido), `--voice-ref -26` (la cadena
actúa igual sin importar el nivel de entrada) y `--sfx-db` (nivel de los efectos). Ejemplo en el
encabezado del script; `regalos_sfx.py` es la línea de tiempo de efectos del reel de regalos.
Si la voz suena encajonada o le falta presencia, `--clarity` (EQ de claridad + compresión de palabras
suaves) y `--lufs -13`; `--keep-natural a-b` conserva sonidos reales (pasos, risas) en esos segundos.

## Fórmula de pedido (de la guía)

> Editá **[mi clip.mp4]** en formato vertical 1080×1920 a 30 fps. Sumá un **[estilo]** con
> **[contenido: textos, datos, ítems]**, sincronizado con **[cuándo: "cuando digo…"]**.
> Look: **[colores, tipografía, sensación]**. Mostrámelo en la vista previa antes de renderizar.

Pedí primero la transcripción con Whisper para poder decir "cuando digo X" en lugar de segundos.

## Origen de las skills

| Skill | Repositorio | Commit | Licencia |
|---|---|---|---|
| hyperframes, hyperframes-cli, hyperframes-registry, media-use, remotion-to-hyperframes, figma, slideshow, reverse-any-video | github.com/heygen-com/hyperframes | `164d6c7` | Apache-2.0 |
| video-editing | github.com/affaan-m/everything-claude-code | `b38be6a` | MIT |

Para actualizarlas: `npx skills add heygen-com/hyperframes` y
`npx skills add affaan-m/everything-claude-code --skill video-editing`.
