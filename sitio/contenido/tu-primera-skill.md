---
titulo: Tu primera Skill para Claude
subtitulo: Tutorial para crear un plugin de habilidades que Claude usa solo cuando lo necesita. Con ejemplo completo para creadores.
tipo: Tutorial
color: mustard
garabato: rayo
nivel: Intermedio
orden: 3
---

## Qué es una Skill

Una **Skill** es una carpeta con instrucciones que Claude lee cuando la tarea lo pide. Es como darle a Claude un manual de procedimientos: en lugar de explicarle cada vez cómo escribes tus guiones, se lo dejas escrito una sola vez.

La diferencia con un asistente o proyecto es que la Skill **se activa sola**. Claude lee la descripción de todas tus Skills y, cuando tu pedido coincide con una, abre su manual completo.

Lo mínimo que necesita una Skill es un archivo llamado `SKILL.md` dentro de una carpeta:

```codigo
guionista-reels/
└── SKILL.md
```

Puede tener más archivos (ejemplos, plantillas, scripts), pero empieza con uno.

## Paso 1 · La cabecera

`SKILL.md` empieza con una cabecera entre líneas de tres guiones. Tiene dos campos obligatorios:

```codigo
---
name: guionista-reels
description: Escribe guiones de Reels y TikToks de 15 a 60 segundos con gancho, desarrollo y llamada a la acción, en la voz de la marca. Úsala cuando pida un guion, un Reel, un TikTok o un video corto.
---
```

- **name**: en minúsculas y con guiones, igual que la carpeta.
- **description**: lo más importante de toda la Skill. Es lo único que Claude lee para decidir si la usa. Di **qué hace** y **cuándo usarla**, con las palabras que tú usarías al pedirlo.

## Paso 2 · Las instrucciones

Debajo de la cabecera escribe el procedimiento en Markdown. Este es un ejemplo completo que puedes copiar:

```codigo
---
name: guionista-reels
description: Escribe guiones de Reels y TikToks de 15 a 60 segundos con gancho, desarrollo y llamada a la acción, en la voz de la marca. Úsala cuando pida un guion, un Reel, un TikTok o un video corto.
---

# Guionista de Reels

## Antes de escribir
Si no te di estos datos, pregúntalos en un solo mensaje:
1. Tema del video
2. Duración (15, 30 o 60 segundos)
3. Qué quiero que haga la gente al final

## Estructura
- Gancho (0-3 s): máximo 8 palabras. Una pregunta, un error o un resultado.
- Desarrollo: un solo punto por cada 5 segundos.
- Cierre: una sola llamada a la acción.

## Formato de entrega
Una tabla con columnas: Segundo | Lo que digo | Texto en pantalla | Toma.
Debajo, 3 ganchos alternativos.

## Voz
- Frases de menos de 15 palabras.
- Hablo de tú.
- Nada de "descubre", "potencia" ni "en el mundo actual".

## Nunca
- Inventar cifras o testimonios.
- Pasar de la duración pedida.
```

## Paso 3 · Instálala

**En Claude Code** (terminal o app de escritorio): guarda la carpeta en tu carpeta personal de Skills para usarla en todos tus proyectos, o dentro del proyecto para compartirla con tu equipo.

```codigo
# Para todos tus proyectos
~/.claude/skills/guionista-reels/SKILL.md

# Solo para un proyecto (se comparte con el repositorio)
.claude/skills/guionista-reels/SKILL.md
```

**En claude.ai:** comprime la carpeta en un archivo ZIP y súbela desde la sección de Skills en la configuración (normalmente dentro de "Capacidades"). Puede que necesites tener activada la ejecución de código.

> Las rutas de menú cambian con las actualizaciones. Si no ves la opción, busca "Skills" en la documentación oficial de Anthropic.

## Paso 4 · Pruébala

Abre una conversación nueva y pide algo natural, sin mencionar la Skill:

```prompt
Hazme un Reel de 30 segundos sobre los 3 errores al elegir colores para tu marca.
```

Si Claude responde con la tabla y los 3 ganchos alternativos, funcionó. Si no la usa, **reescribe la description** con más palabras que la gente usaría al pedir eso.

## Paso 5 · Hazla mejor

- **Agrega ejemplos.** Crea `ejemplos.md` con 3 guiones tuyos que funcionaron y escribe en `SKILL.md`: "Lee ejemplos.md antes de escribir".
- **Separa lo largo.** Si las instrucciones pasan de unas 300 líneas, mueve partes a archivos aparte y enlázalos.
- **Una Skill, un trabajo.** Mejor tres Skills pequeñas (guiones, carruseles, DMs) que una gigante.

## De Skill a plugin

Cuando tengas varias Skills, puedes empaquetarlas en un **plugin** para instalarlas juntas o compartirlas. Un plugin es una carpeta con un archivo de descripción y tus Skills dentro:

```codigo
kit-creador/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    ├── guionista-reels/SKILL.md
    ├── carruseles/SKILL.md
    └── respuestas-dm/SKILL.md
```

```codigo
{
  "name": "kit-creador",
  "version": "1.0.0",
  "description": "Skills de contenido para mi marca personal"
}
```

Un plugin también puede incluir comandos, agentes y conexiones con otras herramientas. Para instalar y gestionar plugins en Claude Code, usa el comando `/plugin`. Revisa la documentación oficial de plugins antes de publicarlo, porque el formato puede cambiar.

## Ideas de Skills para tu marca

- **Editor de captions:** corrige subtítulos y nombres propios que la transcripción escribe mal.
- **Respuestas a DMs:** clasifica el mensaje (duda, interés de compra, queja) y propone respuesta.
- **Carrusel en 8:** convierte cualquier idea en un carrusel de 8 diapositivas con tu estructura.
- **Revisor anti-robot:** quita de tus textos las frases que suenan a IA.
- **Planificador semanal:** arma tu calendario con tus pilares y frecuencias.

## Checklist

- [ ] Mi carpeta y el campo name se llaman igual
- [ ] La description dice qué hace y cuándo usarla
- [ ] La probé con un pedido natural, sin nombrarla
- [ ] Agregué al menos un archivo de ejemplos
