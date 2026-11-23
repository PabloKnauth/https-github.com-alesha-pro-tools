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
| **Mapas** | Bloques de 16×16, capa de suelo y capa de encima, colisiones (también automáticas desde bloques marcados como sólidos) y eventos: NPC, carteles, objetos, puertas e inicio del jugador. |
| **Eventos** | Mecánicas con bloques: mensajes, preguntas sí/no, banderas, regalos, combates, curar, mover personajes, teletransportar. Genera **Poryscript** en vivo. |
| **Probar** | Pantalla de 240×160 donde caminas por el mapa, hablas con los NPC y ejecutas los eventos. Cruceta táctil incluida. |
| **Exportar** | ZIP para **decomp (pokeemerald-expansion)**: PNG indexados 4bpp, paletas JASC, `species_info`, learnsets, `map.bin` + `map.json` para Porymap, `.pory` y `trainers.party`. Y ZIP para **Pokémon Essentials**: sprites ampliados, hoja 4×4 y entradas PBS. |

## Por qué decomp y no editar la ROM

Las herramientas clásicas (Advance Map, XSE) escriben directamente dentro del `.gba`. Funciona, pero es frágil:
un puntero mal movido corrompe la ROM. El flujo decomp edita archivos de texto e imágenes, se compila con `make`
y produce la ROM. Para distribuir un hack se comparte un parche (`.bps`/`.ups`), nunca la ROM.

## Desarrollo

- Sin dependencias ni paso de compilación: `js/*.js` son scripts clásicos que comparten el objeto global `F`.
- `tools/make_sample.py` genera `js/sample.js`, el proyecto de ejemplo (arte original procedural).
- `tools/build_artifact.py` produce `dist/` para publicarlo como página web.

## Límites conocidos (versión 0.1)

- Una paleta por tileset (la GBA permite hasta 13 en los mapas). Los bloques no se componen de tiles 8×8 con volteo.
- La capa “Encima” se usa en la vista previa; en Porymap se configura con bloques de capa superior.
- Los combates se simulan con mensajes en **Probar**; el combate real lo hace el motor del juego.
- Los nombres de campos de `species_info` cambian entre versiones de pokeemerald-expansion: revisa el LEEME del ZIP.
