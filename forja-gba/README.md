# Forja GBA

Estudio web para crear hacks de GBA de criaturas sin escribir código: dibujas sprites, diseñas Fakemon,
armas mapas, programas eventos, los pruebas en el navegador y exportas al proyecto del juego.

Abre `index.html` en Chrome, Edge o Firefox. No necesita instalación ni servidor: todo corre en el navegador
y el proyecto se guarda solo en ese navegador (descárgalo con **Guardar** para tener una copia en archivo).

## Módulos

| Sección | Qué hace |
|---|---|
| **Pixel** | Editor de píxeles con paleta GBA real (16 colores, 15 bits, índice 0 transparente). Lápiz, cubeta, línea, rectángulo, óvalo, cuentagotas, mover, simetría, papel cebolla, rejilla de tiles 8×8, deshacer. Plantillas con medidas exactas: personaje del mapa 32×32 (9 cuadros), Fakemon 64×64, ícono 32×32, entrenador 64×64, tileset 128×128. |
| **Animación** | Vista previa con el ritmo del juego (7.5 fps), las 4 direcciones y caminata. Ayudantes que dejan un borrador consistente: caminata desde los 3 cuadros quietos, cuadro de entrada del Fakemon, salto del ícono. |
| **Importar** | Detecta imágenes ampliadas (×2, ×3… aunque estén desfasadas 1 px), reduce a 15 colores y convierte hojas 4×4 de RPG Maker / Essentials al orden de 9 cuadros de la GBA. |
| **Fakemon** | Tipos, estadísticas con radar y guía de balance por total, habilidades y movimientos en español (se traducen a constantes `MOVE_*` / `ABILITY_*`), crianza, evolución y vista de combate. |
| **Mapas** | Bloques de 16×16, capa de suelo y capa de encima, colisiones automáticas y comportamientos de bloque (sólido, hierba alta, agua). Eventos: NPC (con flag para ocultarlos), carteles, objetos, puertas, **gatillos** con variable y valor, inicio del jugador y evento al entrar al mapa. Tabla de Pokémon salvajes. |
| **Eventos** | Mecánicas con bloques: mensajes, preguntas sí/no, **elegir entre 2-4 opciones** (p. ej. el Pokémon inicial), banderas, contadores (variables), regalos, combates, curar, mover, ocultar y mostrar personajes, teletransportar. Avisa de los caracteres que la GBA no tiene. Genera **XSE**, **Poryscript** y la lista de comandos de **Essentials** en vivo. |
| **Probar** | Pantalla de 240×160 donde caminas, hablas con los NPC, pisas gatillos, encuentras Fakemon en la hierba alta y ejecutas los eventos con menús de elección. Cruceta táctil incluida. |
| **Exportar** | Tres destinos. **ROM binaria (Advance Map + XSE)**, como en los tutoriales de Escuela ROM Hack: un `.rbc` por evento con `#dynamic`, punteros y textos partidos con `\n \l \p`; flags desde 0x200 y variables desde 0x7FFF con registro; guía por mapa (número de gente, People ID, gatillos, warps, salvajes en los 12 huecos) y gráficos BMP de 16 colores. **decomp (pokeemerald-expansion)**: PNG 4bpp, `species_info`, learnsets, `map.json` con gatillos, encuentros y Poryscript. **Pokémon Essentials 16-19 o 20-21**: sprites ampliados, PBS en el formato de cada versión y los comandos de cada evento (`pbAddPokemon`, Mostrar elecciones…). |

## Por qué decomp y no editar la ROM

Las herramientas clásicas (Advance Map, XSE) escriben directamente dentro del `.gba`. Funciona, pero es frágil:
un puntero mal movido corrompe la ROM. El flujo decomp edita archivos de texto e imágenes, se compila con `make`
y produce la ROM. Para distribuir un hack se comparte un parche (`.bps`/`.ups`), nunca la ROM.

## Fuentes usadas para afinar la herramienta

- Tutoriales de Escuela ROM Hack (temas IV, VII, IX y XI): sintaxis de XSE, rangos de flags libres, gatillos y scripts de nivel.
- Archivos de Advance Map 1.95: tabla de caracteres de Gen 3, comportamientos de bloque y tipos de movimiento.
- XSE 1.1.1: índices de especies y objetos (`tools/make_rom_tables.py` genera `js/romdata.js` a partir de ellos).
- Video “Cómo hacer tu propio juego de Pokémon 2” (Essentials 16.3): capas del mapa y el evento de elegir inicial.

## Desarrollo

- Sin dependencias ni paso de compilación: `js/*.js` son scripts clásicos que comparten el objeto global `F`.
- `tools/make_sample.py` genera `js/sample.js`, el proyecto de ejemplo (arte original procedural).
- `tools/make_rom_tables.py "<carpeta de XSE 1.1.1>"` regenera `js/romdata.js`.
- `js/compilers.js` traduce los eventos a Poryscript, XSE y Essentials.
- `tools/build_artifact.py` produce `dist/` para publicarlo como página web.

## Límites conocidos (versión 0.2)

- Una paleta por tileset (la GBA permite hasta 13 en los mapas). Los bloques no se componen de tiles 8×8 con volteo.
- La capa “Encima” se usa en la vista previa; en Porymap se configura con bloques de capa superior.
- Los combates se simulan con mensajes en **Probar**; el combate real lo hace el motor del juego.
- En GBA (XSE y Poryscript), “Elegir entre opciones” se convierte en preguntas sí/no una tras otra: los menús propios de
  Rojo Fuego son listas fijas de la ROM. En Essentials sí es un menú real (Mostrar elecciones).
- Las variables empiezan en 0x7FFF como en los tutoriales. Comprueba en el emulador que el progreso se conserva al
  guardar y reiniciar; si no, cambia la primera variable en Exportar → Ajustes.
- No escribe dentro de la ROM: genera lo que se pega en XSE, Advance Map, NSE y unLZ-GBA. Nada se probó todavía en una ROM real.
- Los nombres de campos de `species_info` cambian entre versiones de pokeemerald-expansion: revisa el LEEME del ZIP.
