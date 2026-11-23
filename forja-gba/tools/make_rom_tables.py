#!/usr/bin/env python3
"""Genera js/romdata.js (índices de objetos y especies de Gen 3) a partir de los archivos de XSE 1.1.1.

Uso: python3 tools/make_rom_tables.py "<carpeta de XSE 1.1.1>"
Lee stdpoke.rbh y "Items español.rbc". Solo extrae nombres e índices numéricos.
"""
import json
import os
import re
import sys
import unicodedata

xse = sys.argv[1]
defs = lambda path, enc: re.findall(r'#define\s+(\S.*?)\s+(0x[0-9A-Fa-f]+)\s*$', open(path, encoding=enc).read(), re.M)
norm = lambda s: re.sub(r'[^A-Z0-9]', '', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().upper())

species = []
for name, val in defs(os.path.join(xse, 'stdpoke.rbh'), 'latin-1'):
    n = name[len('PKMN_'):] if name.startswith('PKMN_') else name
    if n in ('MISSINGNO',) or n.startswith('UNKNOWN') or n == '':
        continue
    species.append([n, int(val, 16)])

items = {}
for name, val in defs(os.path.join(xse, 'Items español.rbc'), 'latin-1'):
    n = name[len('ITEM_'):] if name.startswith('ITEM_') else name
    if n == 'NADA':
        continue
    items.setdefault(norm(n), int(val, 16))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'romdata.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('/* Índices de Gen 3 (Rojo Fuego) para exportar a XSE. Generado por tools/make_rom_tables.py. */\n')
    f.write("'use strict';\nwindow.F = window.F || {};\n")
    f.write('window.F.ROM_SPECIES = ' + json.dumps(species, separators=(',', ':')) + ';\n')
    f.write('window.F.ROM_ITEMS = ' + json.dumps(items, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(species), 'especies,', len(items), 'objetos ->', out)
