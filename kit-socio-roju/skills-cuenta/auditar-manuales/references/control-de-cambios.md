# Verificación de fidelidad y gestión de cambios

## Para rediseños con contenido intocable
1. Preservar el archivo original y definir qué versión será la fuente única.
2. Comparar **índice y número de secciones**, luego títulos, subtítulos, párrafos, viñetas, tablas, cifras, notas, excepciones y anexos.
3. Revisar logos auténticos, imágenes/ilustraciones, ubicación de advertencias y paginación de referencias.
4. Clasificar diferencias: (a) cambio de formato sin cambio de contenido, (b) diferencia de texto, (c) contenido faltante, (d) elemento nuevo, (e) resultado de extracción incierto.
5. Si hay texto faltante o cambiado, detener la aprobación y recuperar contenido antes de entregar.
6. Si solo hay extracción PDF imperfecta, revisar visualmente; **no declarar equivalencia demostrada**.

## Script optativo de comparación
`scripts/comparar_texto.py` compara exportaciones `.txt` / `.md` de dos versiones. Solo asegura identidad de los **archivos de texto que recibe**, no de todas las páginas visuales. Utilizar únicamente cuando ambas extracciones representen fielmente los documentos.

```bash
python scripts/comparar_texto.py fuente.txt redisenado.txt
```

## Gestión de cambios sustantivos
Crear propuesta separada con motivo, texto original, texto sugerido, impacto y responsable de aprobación. No integrar esos cambios al documento aprobado mientras estén pendientes.
