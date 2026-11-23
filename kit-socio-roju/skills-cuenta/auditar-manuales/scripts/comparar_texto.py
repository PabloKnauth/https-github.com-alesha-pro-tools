#!/usr/bin/env python3
"""Compara dos extracciones de texto UTF-8 sin normalizar su contenido.

Uso: python comparar_texto.py original.txt redisenado.txt
Salida: código 0 si iguales; 1 si diferentes; 2 si error de entrada.
ADVERTENCIA: la comparación solo verifica los textos suministrados, no la totalidad
visual de PDFs, imágenes, logos ni la fidelidad de OCR/extracción.
"""
from pathlib import Path
import sys, difflib

def main():
    if len(sys.argv) != 3:
        print('Uso: comparar_texto.py FUENTE.txt RESULTADO.txt', file=sys.stderr)
        return 2
    first, second = (Path(p) for p in sys.argv[1:])
    try:
        a, b = first.read_text(encoding='utf-8-sig'), second.read_text(encoding='utf-8-sig')
    except Exception as exc:
        print(f'No se pudieron leer los archivos: {exc}', file=sys.stderr)
        return 2
    if a == b:
        print('COINCIDENCIA EXACTA en el texto aportado. No se verificaron elementos visuales.')
        return 0
    print('DIFERENCIAS DETECTADAS entre los textos aportados. Revisar las líneas siguientes.')
    lines = list(difflib.unified_diff(a.splitlines(), b.splitlines(), fromfile=str(first), tofile=str(second), lineterm=''))
    for line in lines[:120]:
        print(line)
    if len(lines)>120:
        print(f'... {len(lines)-120} líneas adicionales omitidas en pantalla.')
    return 1
if __name__ == '__main__':
    sys.exit(main())
