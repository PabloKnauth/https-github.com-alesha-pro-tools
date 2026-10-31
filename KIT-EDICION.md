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
