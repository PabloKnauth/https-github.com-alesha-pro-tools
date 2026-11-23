#!/usr/bin/env python3
"""Genera js/pokedex.js: estadísticas de referencia de todos los Pokémon (y sus formas con datos propios).

Fuente: archivos CSV de PokeAPI (https://github.com/PokeAPI/pokeapi, carpeta data/v2/csv, licencia BSD-3).
Uso: python3 tools/make_pokedex.py <carpeta con los CSV>
Solo se guardan datos de juego (números, tipos, nombres): no se incluye ningún gráfico.
"""
import csv
import json
import os
import sys

src = sys.argv[1]
ES, EN = '7', '9'


def rows(name):
    with open(os.path.join(src, name + '.csv'), encoding='utf-8') as f:
        return list(csv.DictReader(f))


species = {r['id']: r for r in rows('pokemon_species')}
sp_name = {r['pokemon_species_id']: r['name'] for r in rows('pokemon_species_names') if r['local_language_id'] == ES}
sp_name_en = {r['pokemon_species_id']: r['name'] for r in rows('pokemon_species_names') if r['local_language_id'] == EN}
type_en = {r['type_id']: r['name'].upper() for r in rows('type_names') if r['local_language_id'] == EN}
ab_es = {r['ability_id']: r['name'] for r in rows('ability_names') if r['local_language_id'] == ES}
ab_en = {r['ability_id']: r['name'] for r in rows('ability_names') if r['local_language_id'] == EN}

stats, types, abil, eggs = {}, {}, {}, {}
for r in rows('pokemon_stats'):
    stats.setdefault(r['pokemon_id'], [0] * 6)[int(r['stat_id']) - 1] = int(r['base_stat'])
for r in rows('pokemon_types'):
    types.setdefault(r['pokemon_id'], {})[int(r['slot'])] = type_en.get(r['type_id'], '')
for r in rows('pokemon_abilities'):
    abil.setdefault(r['pokemon_id'], []).append((int(r['slot']), r['is_hidden'] == '1', r['ability_id']))
EGG = {'1': 'MONSTER', '2': 'WATER_1', '3': 'BUG', '4': 'FLYING', '5': 'FIELD', '6': 'FAIRY', '7': 'GRASS', '8': 'HUMAN_LIKE', '9': 'WATER_3', '10': 'MINERAL', '11': 'AMORPHOUS', '12': 'WATER_2', '13': 'DITTO', '14': 'DRAGON', '15': 'NO_EGGS_DISCOVERED'}
for r in rows('pokemon_egg_groups'):
    eggs.setdefault(r['species_id'], []).append(EGG.get(r['egg_group_id'], ''))
GROWTH = {'1': 'SLOW', '2': 'MEDIUM_FAST', '3': 'FAST', '4': 'MEDIUM_SLOW', '5': 'ERRATIC', '6': 'FLUCTUATING'}
FORM = {'mega': 'Mega', 'mega-x': 'Mega X', 'mega-y': 'Mega Y', 'alola': 'Alola', 'galar': 'Galar', 'hisui': 'Hisui', 'paldea': 'Paldea', 'origin': 'Origen', 'therian': 'Tótem', 'primal': 'Primigenio'}
SKIP = ('-gmax', '-totem', '-starter', '-cap', '-cosplay', '-rock-star', '-belle', '-pop-star', '-phd', '-libre', '-eternamax')

out = []
for r in rows('pokemon'):
    pid, sid = r['id'], r['species_id']
    ident = r['identifier']
    if any(s in ident for s in SKIP):
        continue
    sp = species[sid]
    is_default = r['is_default'] == '1'
    st = stats.get(pid)
    if not st:
        continue
    t = types.get(pid, {})
    form = ''
    if not is_default:
        suffix = ident[len(species[sid]['identifier']) + 1:] if ident.startswith(species[sid]['identifier'] + '-') else ident
        form = FORM.get(suffix, suffix.replace('-', ' ').title())
    abs_ = sorted(abil.get(pid, []))
    normal = [ab_es.get(a) or ab_en.get(a, '') for s, hdn, a in abs_ if not hdn]
    hidden = next((ab_es.get(a) or ab_en.get(a, '') for s, hdn, a in abs_ if hdn), '')
    gr = int(sp['gender_rate'])
    out.append([
        int(sp['id']),                                      # 0 número nacional
        sp_name.get(sid) or sp_name_en.get(sid, ident),     # 1 nombre
        form,                                               # 2 forma
        [t.get(1, 'NORMAL'), t.get(2, '')],                 # 3 tipos
        st,                                                 # 4 PS, Atq, Def, AtEsp, DefEsp, Vel
        normal[:2], hidden,                                 # 5, 6 habilidades
        int(sp['generation_id']),                           # 7 generación
        int(r['height']) / 10, int(r['weight']) / 10,       # 8, 9 altura (m) y peso (kg)
        int(sp['capture_rate']), int(r['base_experience'] or 0),  # 10, 11
        -1 if gr < 0 else gr * 12.5,                        # 12 % hembras
        GROWTH.get(sp['growth_rate_id'], 'MEDIUM_FAST'),    # 13 crecimiento
        eggs.get(sid, [])[:2],                              # 14 grupos huevo
        1 if sp['is_legendary'] == '1' else 2 if sp['is_mythical'] == '1' else 0,  # 15 legendario/singular
        int(sp['evolves_from_species_id']) if sp['evolves_from_species_id'] else 0,  # 16 evoluciona de
    ])

# quitar formas idénticas a la forma base (solo cambian de aspecto)
base = {e[0]: e for e in out if not e[2]}
out = [e for e in out if not e[2] or e[4] != base[e[0]][4] or e[3] != base[e[0]][3]]
seen, uniq = set(), []
for e in out:
    k = (e[0], e[2], tuple(e[4]), tuple(e[3]))
    if k not in seen:
        seen.add(k); uniq.append(e)
out = uniq
out.sort(key=lambda e: (e[0], e[2] != '', e[2]))
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'pokedex.js')
with open(dst, 'w', encoding='utf-8') as f:
    f.write('/* Estadísticas de referencia de los Pokémon oficiales (datos de PokeAPI, BSD-3). Generado por tools/make_pokedex.py.\n')
    f.write('   [num, nombre, forma, [tipo1, tipo2], [PS, Atq, Def, AtEsp, DefEsp, Vel], [habilidades], oculta, gen, altura, peso,\n')
    f.write('    captura, expBase, %hembras, crecimiento, [huevo], legendario(1)/singular(2), evolucionaDe] */\n')
    f.write("'use strict';\nwindow.F = window.F || {};\nwindow.F.POKEDEX = ")
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

# diccionarios completos: nombre en español -> constante del juego (y datos del movimiento)
moves = {}
mv = {r['id']: r for r in rows('moves')}
CLASS = {'1': 'estado', '2': 'físico', '3': 'especial'}
for r in rows('move_names'):
    if r['local_language_id'] != ES or int(r['move_id']) >= 10000:
        continue
    m = mv.get(r['move_id'])
    if not m:
        continue
    moves[r['name']] = [m['identifier'].upper().replace('-', '_'), type_en.get(m['type_id'], ''), int(m['power'] or 0), int(m['accuracy'] or 0), int(m['pp'] or 0), CLASS.get(m['damage_class_id'], '')]
abilities = {}
ab = {r['id']: r for r in rows('abilities')}
for r in rows('ability_names'):
    if r['local_language_id'] == ES and r['ability_id'] in ab and int(r['ability_id']) < 10000:
        abilities[r['name']] = ab[r['ability_id']]['identifier'].upper().replace('-', '_')
with open(dst, 'a', encoding='utf-8') as f:
    f.write('/* nombre en español -> [CONSTANTE, tipo, potencia, precisión, PP, clase] */\nwindow.F.MOVES_INFO = ')
    json.dump(moves, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\nwindow.F.ABILITIES_ALL = ')
    json.dump(abilities, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n/* completa los diccionarios cortos de data.js */\n'
            'if (window.F.MOVES) for (const [k, v] of Object.entries(window.F.MOVES_INFO)) window.F.MOVES[k] = window.F.MOVES[k] || v[0];\n'
            'if (window.F.ABILITIES) for (const [k, v] of Object.entries(window.F.ABILITIES_ALL)) window.F.ABILITIES[k] = window.F.ABILITIES[k] || v;\n')
print(len(out), 'entradas,', len(moves), 'movimientos,', len(abilities), 'habilidades ->', dst, os.path.getsize(dst), 'bytes')
