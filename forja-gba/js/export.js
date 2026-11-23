/* Forja GBA — Exportación: ROM binaria (Advance Map + XSE), decomp (pokeemerald-expansion) y Pokémon Essentials. */
'use strict';
(() => {
  const F = window.F, { h, $ } = F;
  const E = (F.exporter = { target: 'rom' });
  const png = (sprite, order, layout = 'h', scale = 1, cell = null) => { const s = F.sheet(sprite, order, layout, scale, cell); return F.encodePNG(s.px, s.w, s.h, sprite.palette); };
  const bmp = (sprite, order, layout = 'h') => { const s = F.sheet(sprite, order, layout); return F.encodeBMP4(s.px, s.w, s.h, sprite.palette); };
  const all = (s) => s.frames.map((_, i) => i);
  let issues = [];
  const note = (msg) => issues.push(msg);
  const essId = (s) => String(s || '').replace(/_/g, '');
  const usedScripts = (m) => new Set([...m.events.map((e) => e.script), m.onEnter].filter(Boolean));

  /* =========================================================== ROM binaria: Advance Map + XSE */
  /* Tipo de movimiento de Advance Map (lista “Bewegung” en español). */
  const AMAP_MOVE = (e) => (e.movement === 'mirar' ? '01 Mirar alrededor' : e.movement === 'pasear' ? '02 Caminar sin rumbo' : { up: '07 Mirar arriba', down: '08 Mirar abajo', left: '09 Mirar izquierda', right: '0A Mirar derecha' }[e.facing || 'down']);
  /* Advance Map reparte la hierba en 12 huecos con probabilidades fijas. */
  const GRASS_SLOTS = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1];
  const wildSlots = (list) => {
    const out = [], total = list.reduce((a, x) => a + (+x.pct || 0), 0) || 1, want = list.map((x) => ((+x.pct || 0) / total) * 100), got = list.map(() => 0);
    GRASS_SLOTS.forEach((pct) => { let bi = 0, best = -Infinity; want.forEach((w, i) => { const gap = w - got[i]; if (gap > best) { best = gap; bi = i; } }); got[bi] += pct; out.push({ ...list[bi], slotPct: pct }); });
    return { out, got };
  };
  const mapGuide = (m, ids) => {
    const H = F.hex, L = [`MAPA: ${m.name}   (banco ${m.bank}, mapa ${m.num})   ${m.w}×${m.h} bloques`, ''];
    const people = m.events.filter((e) => e.type === 'npc' || e.type === 'item');
    L.push('PERSONAS (pestaña Eventos de Advance Map, en este orden)');
    if (!people.length) L.push('  (ninguna)');
    people.forEach((e, i) => {
      const sc = F.find('scripts', e.script);
      L.push(`  No. de gente ${i + 1}: ${e.name}`, `     X ${H(e.x)}  Y ${H(e.y)}   Movimiento: ${e.type === 'item' ? '08 Mirar abajo (Poké Ball)' : AMAP_MOVE(e)}`,
        `     People ID (flag): ${(() => { const fl = e.type === 'item' ? F.itemFlag(m, e) : e.hideFlag; return fl ? H(ids.flags.get(fl)).slice(2).padStart(4, '0') + '   ← ' + fl : '0000'; })()}`,
        `     Script offset: ${e.type === 'item' ? 'script de objeto: giveitem ' + H((F.ROM_ITEMS || {})[F.constName(e.item).replace(/_/g, '')] ?? 0) + ' 0x1 0x1' : sc ? 'offset de @' + (F.constName(sc.name).toLowerCase().replace(/_/g, '').slice(0, 8) || 'ev') + (F.state.project.scripts.indexOf(sc) + 1) + ' al compilar ' + F.fileName(sc.name) + '.rbc' : '(sin script)'}`);
    });
    const signs = m.events.filter((e) => e.type === 'sign');
    L.push('', 'CARTELES (Signpost, tipo Script)'); if (!signs.length) L.push('  (ninguno)');
    signs.forEach((e) => { const sc = F.find('scripts', e.script); L.push(`  ${e.name}: X ${H(e.x)}  Y ${H(e.y)}   Script: ${sc ? F.fileName(sc.name) + '.rbc' : '(sin script)'}`); });
    const trig = m.events.filter((e) => e.type === 'trigger');
    L.push('', 'GATILLOS (Script de gatillo)'); if (!trig.length) L.push('  (ninguno)');
    trig.forEach((e) => { const sc = F.find('scripts', e.script); L.push(`  ${e.name}: X ${H(e.x)}  Y ${H(e.y)}   Desconocido 0003   Var Number ${H(ids.vars.get(e.var)).slice(2)}   Var Value ${(+e.value || 0).toString(16).toUpperCase().padStart(4, '0')}   Script: ${sc ? F.fileName(sc.name) + '.rbc' : '(sin script)'}`); });
    const warps = m.events.filter((e) => e.type === 'warp');
    L.push('', 'WARPS'); if (!warps.length) L.push('  (ninguno)');
    warps.forEach((e) => { const t = F.find('maps', e.toMap); L.push(`  ${e.name}: X ${H(e.x)}  Y ${H(e.y)}  →  banco ${t ? t.bank : '?'} mapa ${t ? t.num : '?'} (${t ? t.name : 'sin destino'}). El bloque debe tener comportamiento de puerta/warp.`); });
    const enter = F.find('scripts', m.onEnter);
    L.push('', 'SCRIPT DE NIVEL (Ver cabezal → Map script)', enter ? `  ${enter.name}: usa el tipo 02 con una variable y un valor si muestra mensajes o mueve gente; el tipo 03 solo si se limita a recolocar personajes.` : '  (ninguno)');
    L.push('', 'POKÉMON SALVAJES (hierba)');
    if (!m.wild.list.length) L.push('  (ninguno)');
    else {
      L.push(`  Frecuencia: ${m.wild.rate}`);
      const { out } = wildSlots(m.wild.list);
      out.forEach((x, i) => { const sp = F.romSpecies(x.mon); L.push(`  Hueco ${String(i + 1).padStart(2)} (${String(x.slotPct).padStart(2)}%): ${sp.ok ? sp.label + ' ' + H(sp.id) : sp.label + ' (elige a quién reemplaza)'}  Nv. ${x.min}-${x.max}`); });
    }
    L.push('', `CABEZAL: clima ${m.weather || 'NONE'}.  Recuerda “Guardar” en Advance Map después de cada cambio.`);
    return L.join('\r\n') + '\r\n';
  };
  const registry = (ids) => {
    const L = ['REGISTRO DE FLAGS Y VARIABLES — ' + F.state.project.name, 'Guárdalo junto a tu hack para no repetir números (consejo del tema XI de Escuela ROM Hack).', '', 'FLAGS (rangos libres de Rojo Fuego: 0x200-0x29F, 0x500-0x79F, 0x1000-0x109F)'];
    for (const [k, v] of ids.flags) L.push(`  ${F.hex(v).padEnd(7)} ${k}`);
    if (!ids.flags.size) L.push('  (ninguna)');
    L.push('', `VARIABLES (empiezan en ${F.hex(F.settings().firstVar)}; cámbialo en Ajustes)`);
    for (const [k, v] of ids.vars) L.push(`  ${F.hex(v).padEnd(7)} ${k}`);
    if (!ids.vars.size) L.push('  (ninguna)');
    L.push('', 'Flags especiales de Rojo Fuego usadas por Forja: 0x828 activa el menú Pokémon al dar el primero.',
      'Prueba siempre en el emulador: guarda la partida, reinicia y comprueba que el progreso se conserva.');
    return L.join('\r\n') + '\r\n';
  };
  const readmeRom = () => `# ${F.state.project.name} — ROM binaria (Advance Map + XSE)

Para editar directamente una ROM de **Pokémon Rojo Fuego (BPRE)**, como en los tutoriales de Escuela ROM Hack.
Trabaja siempre sobre una **copia** de tu ROM y guarda copias de seguridad a menudo.

## 1. Gráficos (carpeta \`graficos/\`)
Todos son BMP de 16 colores, el formato que aceptan Advance Map, NSE y unLZ-GBA. El primer color es el transparente.
- **Tileset** → Advance Map, Editor de bloques (Ctrl+B) → Imagen → *Cargar Tileset 2*. Carga también su paleta en
  el editor de paletas y pulsa *Write palette changes to ROM*. Luego arma los bloques y asigna comportamientos
  (hierba: *Grass animation*; puertas: *Use door/warp*).
- **Fakemon** (frente, espalda e ícono) → NSE o unLZ-GBA, sobre el número de la especie que reemplazas
  (lo eliges en Fakemon → “Ocupa el lugar de”).
- **Personajes del mapa** → editor de overworlds; los 9 cuadros van en el orden del juego.

## 2. Eventos (carpeta \`scripts/\`)
Abre XSE con tu ROM cargada, pega cada \`.rbc\` y pulsa *Compilar* (engranajes). Copia el offset del primer \`#org\` (el de arriba) que te da XSE
y pégalo en Advance Map en el personaje, cartel o gatillo que indica \`mapas/<Mapa>.txt\`.
Los textos ya vienen partidos con \`\\n\`, \`\\l\` y \`\\p\`. \`[player]\` y \`[rival]\` muestran los nombres.

## 3. Mapas (carpeta \`mapas/\`)
Cada archivo dice qué poner en Advance Map: número de gente, coordenadas, movimiento, People ID (flag de aparición),
gatillos (Desconocido 0003, Var Number, Var Value), warps, script de nivel y Pokémon salvajes.

## 4. Registro
\`REGISTRO_FLAGS_Y_VARIABLES.txt\` lista qué número recibió cada bandera y contador.
${issues.length ? '\n## Revisar\n\n' + [...new Set(issues)].map((i) => '- ' + i).join('\n') + '\n' : ''}`;

  E.rom = () => {
    issues = [];
    const p = F.state.project, files = [], ids = F.romIds(), notes = [];
    p.scripts.forEach((sc) => files.push({ name: `scripts/${F.fileName(sc.name)}.rbc`, data: F.toXSE(sc, { ids, notes }).replace(/\n/g, '\r\n') + '\r\n' }));
    if (p.scripts.length) files.push({ name: 'scripts/TODOS_LOS_EVENTOS.rbc', data: p.scripts.map((sc) => F.toXSE(sc, { ids })).join('\n\n').replace(/\n/g, '\r\n') + '\r\n' });
    notes.filter((x) => !x.includes('Ocupa el lugar de')).forEach(note);
    p.maps.forEach((m) => files.push({ name: `mapas/${F.fileName(m.name)}.txt`, data: mapGuide(m, ids) }));
    p.sprites.forEach((s) => {
      const f = F.fileName(s.name);
      if (s.kind === 'tileset') files.push({ name: `graficos/tilesets/${f}.bmp`, data: bmp(s, [0]) }, { name: `graficos/tilesets/${f}.pal`, data: F.jascPal(s.palette) });
      else if (s.kind.startsWith('overworld')) files.push({ name: `graficos/personajes/${f}.bmp`, data: bmp(s, all(s).slice(0, 9)) }, { name: `graficos/personajes/${f}.pal`, data: F.jascPal(s.palette) });
      else if (s.kind === 'trainer') files.push({ name: `graficos/entrenadores/${f}.bmp`, data: bmp(s, [0]) }, { name: `graficos/entrenadores/${f}.pal`, data: F.jascPal(s.palette) });
    });
    p.fakemons.forEach((m) => {
      const f = F.fileName(m.name), front = F.find('sprites', m.sprites.front), back = F.find('sprites', m.sprites.back), icon = F.find('sprites', m.sprites.icon);
      if (front) files.push({ name: `graficos/fakemon/${f}_frente.bmp`, data: bmp(front, [0]) }, { name: `graficos/fakemon/${f}.pal`, data: F.jascPal(front.palette) }, { name: `graficos/fakemon/${f}_shiny.pal`, data: F.jascPal(F.shinyOf(front.palette)) });
      if (back) files.push({ name: `graficos/fakemon/${f}_espalda.bmp`, data: bmp({ ...back, palette: front ? front.palette : back.palette }, [0]) });
      if (icon) files.push({ name: `graficos/fakemon/${f}_icono.bmp`, data: bmp(icon, [0, icon.frames.length > 1 ? 1 : 0], 'v') });
      if (!m.romSlot) note(`${m.name}: elige qué especie reemplaza en la ROM (Fakemon → “Ocupa el lugar de”).`);
      if (!front) note(`${m.name} no tiene sprite de frente.`);
    });
    files.push({ name: 'REGISTRO_FLAGS_Y_VARIABLES.txt', data: registry(ids) }, { name: 'proyecto.forja.json', data: F.serialize() });
    files.unshift({ name: 'LEEME.md', data: readmeRom() });
    return files;
  };

  /* =========================================================== decomp (pokeemerald-expansion) */
  const frontYOffset = (s) => { const f = s.frames[0]; for (let y = s.h - 1; y >= 0; y--) for (let x = 0; x < s.w; x++) if (f[y * s.w + x]) return s.h - 1 - y; return 0; };
  const speciesInfo = (m) => {
    const C = F.constName(m.name), Cm = F.camel(m.name);
    const ab = [m.abilities[0], m.abilities[1], m.hidden].map((a) => { const r = F.abilityId(a); if (!r.known) note(`Habilidad “${a}” de ${m.name}: revisa ABILITY_${r.id}.`); return r.id ? 'ABILITY_' + r.id : 'ABILITY_NONE'; });
    const types = m.types.filter(Boolean), t2 = types[1] || types[0], egg = m.eggGroups.filter(Boolean), e2 = egg[1] || egg[0];
    const gender = m.genderFemale < 0 ? 'MON_GENDERLESS' : m.genderFemale === 0 ? 'MON_MALE' : m.genderFemale === 100 ? 'MON_FEMALE' : `PERCENT_FEMALE(${m.genderFemale})`;
    const into = F.find('fakemons', m.evo.into);
    const evo = into ? `\n        .evolutions = EVOLUTION({${{ LEVEL: 'EVO_LEVEL', ITEM: 'EVO_ITEM', FRIENDSHIP: 'EVO_FRIENDSHIP', TRADE: 'EVO_TRADE' }[m.evo.method]}, ${m.evo.method === 'LEVEL' ? m.evo.param : m.evo.method === 'ITEM' ? 'ITEM_' + m.evo.param : 0}, SPECIES_${F.constName(into.name)}}),` : '';
    const front = F.find('sprites', m.sprites.front);
    return `    [SPECIES_${C}] =
    {
        .baseHP        = ${m.stats.hp},
        .baseAttack    = ${m.stats.atk},
        .baseDefense   = ${m.stats.def},
        .baseSpeed     = ${m.stats.spe},
        .baseSpAttack  = ${m.stats.spa},
        .baseSpDefense = ${m.stats.spd},
        .types = MON_TYPES(TYPE_${types[0]}, TYPE_${t2}),
        .catchRate = ${m.catchRate},
        .expYield = ${m.expYield},
        .genderRatio = ${gender},
        .eggCycles = 20,
        .friendship = STANDARD_FRIENDSHIP,
        .growthRate = GROWTH_${m.growth},
        .eggGroups = MON_EGG_GROUPS(EGG_GROUP_${egg[0] || 'FIELD'}, EGG_GROUP_${e2 || 'FIELD'}),
        .abilities = { ${ab.join(', ')} },
        .bodyColor = BODY_COLOR_${m.color},
        .speciesName = _("${F.gbaClean(m.name).slice(0, 12)}"),
        .cryId = CRY_NONE,
        .natDexNum = NATIONAL_DEX_NONE,
        .categoryName = _("${F.gbaClean(m.category || '').replace(/"/g, '')}"),
        .height = ${Math.round(m.height * 10)},
        .weight = ${Math.round(m.weight * 10)},
        .description = COMPOUND_STRING(
            "${F.gbaClean(m.dex || 'Sin descripción.').replace(/"/g, '').replace(/\n/g, ' ')}"),
        .pokemonScale = 256,
        .pokemonOffset = 0,
        .trainerScale = 256,
        .trainerOffset = 0,
        .frontPic = gMonFrontPic_${Cm},
        .frontPicSize = MON_COORDS_SIZE(64, 64),
        .frontPicYOffset = ${front ? frontYOffset(front) : 0},
        .frontAnimFrames = sAnims_SingleFramePlaceHolder,
        .frontAnimId = ANIM_V_SQUISH_AND_BOUNCE,
        .backPic = gMonBackPic_${Cm},
        .backPicSize = MON_COORDS_SIZE(64, 64),
        .backPicYOffset = 0,
        .backAnimId = BACK_ANIM_NONE,
        .palette = gMonPalette_${Cm},
        .shinyPalette = gMonShinyPalette_${Cm},
        .iconSprite = gMonIcon_${Cm},
        .iconPalIndex = 0,
        .levelUpLearnset = s${Cm}LevelUpLearnset,
        .teachableLearnset = s${Cm}TeachableLearnset,${evo}
    },`;
  };
  const learnset = (m) => {
    const Cm = F.camel(m.name);
    const rows = m.learnset.filter((l) => l.move).sort((a, b) => a.lvl - b.lvl).map((l) => { const r = F.moveId(l.move); if (!r.known) note(`Movimiento “${l.move}” de ${m.name}: revisa MOVE_${r.id}.`); return `    LEVEL_UP_MOVE(${String(l.lvl).padStart(2)}, MOVE_${r.id}),`; });
    return `static const struct LevelUpMove s${Cm}LevelUpLearnset[] = {\n${rows.join('\n')}\n    LEVEL_UP_END\n};\n\nstatic const u16 s${Cm}TeachableLearnset[] = {\n    MOVE_UNAVAILABLE,\n};\n`;
  };
  const graphicsDecl = (m) => {
    const Cm = F.camel(m.name), f = F.fileName(m.name);
    return `const u32 gMonFrontPic_${Cm}[] = INCBIN_U32("graphics/pokemon/${f}/anim_front.4bpp.lz");
const u32 gMonBackPic_${Cm}[] = INCBIN_U32("graphics/pokemon/${f}/back.4bpp.lz");
const u32 gMonPalette_${Cm}[] = INCBIN_U32("graphics/pokemon/${f}/normal.gbapal.lz");
const u32 gMonShinyPalette_${Cm}[] = INCBIN_U32("graphics/pokemon/${f}/shiny.gbapal.lz");
const u8 gMonIcon_${Cm}[] = INCBIN_U8("graphics/pokemon/${f}/icon.4bpp");
`;
  };
  const trainers = () => { const out = []; F.state.project.scripts.forEach((s) => F.walkSteps(s.steps, (x) => { if (x.op === 'trainer') out.push(x); })); return out; };
  const trainersParty = () => trainers().map((t) => { const mon = F.find('fakemons', t.mon); return `=== TRAINER_${F.constName(t.name)} ===\nName: ${t.name}\nClass: Rival\nPic: Brendan\nGender: Male\nMusic: Male\nDouble Battle: No\nAI: Check Bad Move\n\n${mon ? mon.name : 'Poochyena'}\nLevel: ${t.level || 5}\n`; }).join('\n');
  const mapBin = (m) => { const buf = new Uint8Array(m.w * m.h * 2); for (let i = 0; i < m.w * m.h; i++) { const v = (m.bottom[i] & 0x3ff) | ((m.coll[i] ? 1 : 0) << 10) | (3 << 12); buf[i * 2] = v & 255; buf[i * 2 + 1] = v >> 8; } return buf; };
  const scriptLabel = (id) => { const s = F.find('scripts', id); return s ? F.camel(s.name) : '0x0'; };
  const mapJson = (m) => JSON.stringify({
    id: 'MAP_' + F.constName(m.name), name: F.camel(m.name), layout: 'LAYOUT_' + F.constName(m.name), music: m.music || 'MUS_LITTLEROOT', region_map_section: 'MAPSEC_LITTLEROOT_TOWN',
    requires_flash: false, weather: 'WEATHER_' + (m.weather || 'NONE'), map_type: 'MAP_TYPE_TOWN', allow_cycling: true, allow_escaping: false, allow_running: true, show_map_name: true, battle_scene: 'MAP_BATTLE_SCENE_NORMAL',
    connections: null,
    object_events: m.events.filter((e) => e.type === 'npc' || e.type === 'item').map((e, i) => ({
      graphics_id: e.type === 'item' ? 'OBJ_EVENT_GFX_ITEM_BALL' : 'OBJ_EVENT_GFX_' + F.constName((F.find('sprites', e.sprite) || { name: 'BOY_1' }).name), x: e.x, y: e.y, elevation: 3,
      movement_type: e.type === 'item' ? 'MOVEMENT_TYPE_LOOK_AROUND' : ({ quieto: 'MOVEMENT_TYPE_FACE_' + (e.facing || 'down').toUpperCase(), mirar: 'MOVEMENT_TYPE_LOOK_AROUND', pasear: 'MOVEMENT_TYPE_WANDER_AROUND' })[e.movement || 'quieto'],
      movement_range_x: e.movement === 'pasear' ? 2 : 0, movement_range_y: e.movement === 'pasear' ? 2 : 0, trainer_type: 'TRAINER_TYPE_NONE', trainer_sight_or_berry_tree_id: e.type === 'item' ? 'ITEM_' + F.itemId(e.item).id : '0',
      script: e.type === 'item' ? 'Common_EventScript_FindItem' : scriptLabel(e.script),
      flag: e.type === 'item' ? 'FLAG_ITEM_' + F.constName(m.name + '_' + (i + 1)) : e.hideFlag ? 'FLAG_' + F.constName(e.hideFlag) : '0',
    })),
    warp_events: m.events.filter((e) => e.type === 'warp').map((e) => ({ x: e.x, y: e.y, elevation: 0, dest_map: 'MAP_' + F.constName((F.find('maps', e.toMap) || { name: 'NONE' }).name), dest_warp_id: '0' })),
    coord_events: m.events.filter((e) => e.type === 'trigger').map((e) => ({ type: 'trigger', x: e.x, y: e.y, elevation: 3, var: 'VAR_' + F.constName(e.var), var_value: String(+e.value || 0), script: scriptLabel(e.script) })),
    bg_events: m.events.filter((e) => e.type === 'sign').map((e) => ({ type: 'sign', x: e.x, y: e.y, elevation: 0, player_facing_dir: 'BG_EVENT_PLAYER_FACING_ANY', script: scriptLabel(e.script) })),
  }, null, 2);
  const wildJson = (maps) => JSON.stringify(maps.filter((m) => m.wild.list.length).map((m) => {
    const { out } = wildSlots(m.wild.list);
    return { map: 'MAP_' + F.constName(m.name), base_label: 'g' + F.camel(m.name), land_mons: { encounter_rate: m.wild.rate, mons: out.map((x) => ({ min_level: Math.min(x.min, x.max), max_level: Math.max(x.min, x.max), species: 'SPECIES_' + F.constName((F.find('fakemons', x.mon) || { name: 'NONE' }).name) })) } };
  }), null, 2);
  const readmeDecomp = (p) => `# ${p.name} — proyecto decomp (pokeemerald-expansion)

Copia cada carpeta sobre tu proyecto y compila con \`make\`.

1. **Gráficos de Fakemon** → \`graphics/pokemon/<nombre>/\`: \`anim_front.png\` (2 cuadros de 64×64 apilados), \`back.png\`,
   \`icon.png\` (32×64), \`normal.pal\` y \`shiny.pal\`. El build los convierte a 4bpp solo.
2. **Datos** → \`src/data/pokemon/forja/\`: pega \`species_info.h\` dentro de \`gSpeciesInfo\`, los learnsets en
   \`level_up_learnsets\` y \`graphics.h\` en \`src/data/graphics/pokemon.h\`. En \`include/constants/species.h\` define
   \`SPECIES_FORJA_START\` como el número siguiente a tu última especie, pega \`species_constants.h\` y mueve \`SPECIES_EGG\` detrás.
3. **Personajes** → \`graphics/object_events/pics/people/\` (9 cuadros en orden del juego); regístralos en \`object_event_graphics_info.h\`.
4. **Mapas** → ábrelos con **Porymap**. \`map.json\` trae personas (con su flag para ocultarlas), carteles, warps y gatillos.
5. **Encuentros** → mezcla \`wild_encounters_forja.json\` en \`src/data/wild_encounters.json\`.
6. **Eventos** → \`data/maps/<Mapa>/scripts.pory\`. Las elecciones de 2-4 opciones se preguntan una por una (sí/no).
7. **Entrenadores** → añade \`trainers_forja.party\` a \`src/data/trainers.party\`.
8. **Banderas** usadas: ${[...p.scripts.reduce((s, sc) => F.scriptFlags(sc.steps, s), new Set())].join(', ') || 'ninguna'}. Defínelas en \`include/constants/flags.h\`
   reutilizando \`FLAG_UNUSED_*\`, y las variables \`VAR_*\` en \`include/constants/vars.h\` con \`VAR_UNUSED_*\`.

> Los nombres de campos cambian entre versiones de expansion. Si el compilador marca uno, compáralo con un Pokémon de tu versión.
${issues.length ? '\n## Revisar antes de compilar\n\n' + [...new Set(issues)].map((i) => '- ' + i).join('\n') + '\n' : ''}`;

  E.decomp = () => {
    issues = [];
    const p = F.state.project, files = [];
    p.fakemons.forEach((m) => {
      const f = F.fileName(m.name), base = `graphics/pokemon/${f}/`;
      const front = F.find('sprites', m.sprites.front), back = F.find('sprites', m.sprites.back), icon = F.find('sprites', m.sprites.icon);
      if (front) files.push({ name: base + 'anim_front.png', data: png(front, [0, front.frames.length > 1 ? 1 : 0], 'v') }, { name: base + 'front.png', data: png(front, [0]) }, { name: base + 'normal.pal', data: F.jascPal(front.palette) }, { name: base + 'shiny.pal', data: F.jascPal(F.shinyOf(front.palette)) });
      else note(`${m.name} no tiene sprite de frente.`);
      if (back) { files.push({ name: base + 'back.png', data: png({ ...back, palette: front ? front.palette : back.palette }, [0]) }); if (front && back.palette.join() !== front.palette.join()) note(`${m.name}: la espalda usa otra paleta; en GBA frente y espalda comparten la del frente.`); }
      else note(`${m.name} no tiene sprite de espalda.`);
      if (icon) files.push({ name: base + 'icon.png', data: png(icon, [0, icon.frames.length > 1 ? 1 : 0], 'v') }); else note(`${m.name} no tiene ícono.`);
    });
    if (p.fakemons.length) files.push(
      { name: 'src/data/pokemon/forja/species_info.h', data: '// Pegar dentro de gSpeciesInfo[]\n\n' + p.fakemons.map(speciesInfo).join('\n\n') + '\n' },
      { name: 'src/data/pokemon/forja/learnsets.h', data: p.fakemons.map(learnset).join('\n') },
      { name: 'src/data/pokemon/forja/graphics.h', data: p.fakemons.map(graphicsDecl).join('\n') },
      { name: 'src/data/pokemon/forja/species_constants.h', data: p.fakemons.map((m, i) => `#define SPECIES_${F.constName(m.name)} (SPECIES_FORJA_START + ${i})`).join('\n') + '\n' });
    p.sprites.forEach((s) => {
      const f = F.fileName(s.name);
      if (s.kind.startsWith('overworld')) { files.push({ name: `graphics/object_events/pics/people/${f}.png`, data: png(s, all(s).slice(0, 9)) }, { name: `graphics/object_events/palettes/${f}.pal`, data: F.jascPal(s.palette) }); if (s.frames.length !== 9) note(`${s.name}: un personaje del mapa necesita 9 cuadros (tiene ${s.frames.length}).`); }
      if (s.kind === 'trainer') files.push({ name: `graphics/trainers/front_pics/${f}.png`, data: png(s, [0]) }, { name: `graphics/trainers/palettes/${f}.pal`, data: F.jascPal(s.palette) });
      if (s.kind === 'tileset') files.push({ name: `data/tilesets/secondary/${f}/tiles.png`, data: png(s, [0]) }, { name: `data/tilesets/secondary/${f}/palettes/00.pal`, data: F.jascPal(s.palette) });
    });
    p.maps.forEach((m) => {
      const C = F.camel(m.name), used = usedScripts(m);
      files.push({ name: `data/layouts/${C}/map.bin`, data: mapBin(m) }, { name: `data/maps/${C}/map.json`, data: mapJson(m) });
      const enter = F.find('scripts', m.onEnter);
      const ms = enter ? `mapscripts ${C}_MapScripts {\n    MAP_SCRIPT_ON_FRAME_TABLE [\n        VAR_${F.constName(m.name)}_ENTRADA, 0: ${F.camel(enter.name)}\n    ]\n}` : `mapscripts ${C}_MapScripts {}`;
      if (enter) note(`${m.name}: el evento al entrar usa VAR_${F.constName(m.name)}_ENTRADA = 0; ponla en 1 al final del evento para que no se repita.`);
      files.push({ name: `data/maps/${C}/scripts.pory`, data: `${ms}\n\n${p.scripts.filter((s) => used.has(s.id)).map((s) => F.toPory(s)).join('\n\n')}\n` });
    });
    if (p.maps.some((m) => m.wild.list.length)) files.push({ name: 'src/data/wild_encounters_forja.json', data: wildJson(p.maps) });
    if (p.scripts.length) files.push({ name: 'data/scripts/forja.pory', data: p.scripts.map((s) => F.toPory(s)).join('\n\n') + '\n' });
    const party = trainersParty(); if (party) files.push({ name: 'src/data/trainers_forja.party', data: party });
    files.push({ name: 'proyecto.forja.json', data: F.serialize() });
    files.unshift({ name: 'LEEME.md', data: readmeDecomp(p) });
    return files;
  };

  /* =========================================================== Pokémon Essentials (v16-v19 o v20-v21) */
  const ess = (list, v) => (list.find((x) => x[0] === v) || [])[2];
  const pbsV16 = (m, num) => {
    const into = F.find('fakemons', m.evo.into);
    const evoParam = m.evo.method === 'LEVEL' ? m.evo.param : m.evo.method === 'ITEM' ? ess(F.STONES, m.evo.param) : '';
    return [`#-------------------------------`, `[${num}]`, `Name=${m.name}`, `InternalName=${F.constName(m.name).replace(/_/g, '')}`, `Type1=${m.types[0]}`, m.types[1] ? `Type2=${m.types[1]}` : null,
      `BaseStats=${m.stats.hp},${m.stats.atk},${m.stats.def},${m.stats.spe},${m.stats.spa},${m.stats.spd}`, `GenderRate=${ess(F.GENDERS, m.genderFemale) || 'Female50Percent'}`, `GrowthRate=${ess(F.GROWTH, m.growth)}`,
      `BaseEXP=${m.expYield}`, 'EffortPoints=0,0,0,1,0,0', `Rareness=${m.catchRate}`, 'Happiness=70',
      `Abilities=${[m.abilities[0], m.abilities[1]].filter(Boolean).map((a) => essId(F.abilityId(a).id)).join(',')}`, m.hidden ? `HiddenAbility=${essId(F.abilityId(m.hidden).id)}` : null,
      `Moves=${m.learnset.filter((l) => l.move).sort((a, b) => a.lvl - b.lvl).map((l) => `${l.lvl},${essId(F.moveId(l.move).id)}`).join(',')}`, 'EggMoves=',
      `Compatibility=${m.eggGroups.filter(Boolean).map((e) => ess(F.EGG_GROUPS, e)).join(',')}`, 'StepsToHatch=5120', `Height=${m.height}`, `Weight=${m.weight}`, `Color=${ess(F.COLORS, m.color)}`,
      `Kind=${m.category}`, `Pokedex=${(m.dex || '').replace(/\n/g, ' ')}`, 'BattlerPlayerY=0', 'BattlerEnemyY=0', 'BattlerAltitude=0',
      into ? `Evolutions=${F.constName(into.name).replace(/_/g, '')},${ess(F.EVO_METHODS, m.evo.method)},${evoParam}` : 'Evolutions=',
    ].filter((x) => x != null).join('\r\n');
  };
  const pbsV20 = (m) => {
    const into = F.find('fakemons', m.evo.into), ab = [m.abilities[0], m.abilities[1]].filter(Boolean).map((a) => essId(F.abilityId(a).id));
    const evoParam = m.evo.method === 'LEVEL' ? m.evo.param : m.evo.method === 'ITEM' ? ess(F.STONES, m.evo.param) : '';
    return ['#-------------------------------', `[${F.constName(m.name).replace(/_/g, '')}]`, `Name = ${m.name}`, `Types = ${m.types.filter(Boolean).join(',')}`,
      `BaseStats = ${m.stats.hp},${m.stats.atk},${m.stats.def},${m.stats.spe},${m.stats.spa},${m.stats.spd}`, `GenderRatio = ${ess(F.GENDERS, m.genderFemale) || 'Female50Percent'}`,
      `GrowthRate = ${ess(F.GROWTH, m.growth)}`, `BaseExp = ${m.expYield}`, `CatchRate = ${m.catchRate}`, 'Happiness = 70', ab.length ? `Abilities = ${ab.join(',')}` : null,
      m.hidden ? `HiddenAbilities = ${essId(F.abilityId(m.hidden).id)}` : null,
      `Moves = ${m.learnset.filter((l) => l.move).sort((a, b) => a.lvl - b.lvl).map((l) => `${l.lvl},${essId(F.moveId(l.move).id)}`).join(',')}`,
      `EggGroups = ${m.eggGroups.filter(Boolean).map((e) => ess(F.EGG_GROUPS, e)).join(',')}`, 'HatchSteps = 5120', `Height = ${m.height}`, `Weight = ${m.weight}`, `Color = ${ess(F.COLORS, m.color)}`,
      `Category = ${m.category}`, `Pokedex = ${(m.dex || '').replace(/\n/g, ' ')}`, 'Generation = 9', into ? `Evolutions = ${F.constName(into.name).replace(/_/g, '')},${ess(F.EVO_METHODS, m.evo.method)},${evoParam}` : null,
    ].filter((x) => x != null).join('\r\n');
  };
  const trainersEss = (v16) => trainers().map((t) => { const mon = F.find('fakemons', t.mon), sp = mon ? F.constName(mon.name).replace(/_/g, '') : 'RATTATA', type = F.constName(t.name).replace(/_/g, '');
    return v16 ? `#-------------------\r\n${type}\r\n${t.name}\r\n1\r\n${sp},${t.level || 5}` : `#-------------------\r\n[${type},${t.name}]\r\nPokemon = ${sp},${t.level || 5}`; }).join('\r\n');
  const readmeEss = (v16) => `# ${F.state.project.name} — Pokémon Essentials ${v16 ? '16-19' : '20-21'}

Copia \`Graphics/\` y \`PBS/\` dentro de la carpeta de tu juego (la que tiene \`Game.rxproj\`).

1. **Fakemon**: pega \`PBS/pokemon_forja.txt\` al final de \`PBS/pokemon.txt\`${v16 ? ' (los números siguen al último de tu base: Essentials 16.3 trae 721)' : ''} y compila
   (inicia el juego en modo debug o abre el **Editor** de Essentials).
2. **Sprites**: ampliados ×3 (Pokémon de 64 px → 192 px) y ×2 (personajes, entrenadores, tilesets), como espera Essentials.
   ${v16 ? 'En 16-19 los Pokémon se nombran por número: `Graphics/Battlers/722.png` (frente), `722b.png` (espalda), `722s.png` (shiny) y `Graphics/Icons/icon722.png`.' : 'En 20-21 se nombran por nombre interno: `Graphics/Pokemon/Front/NOMBRE.png`.'}
3. **Tilesets**: \`Graphics/Tilesets/\`. En RPG Maker XP: Base de datos → Tilesets → elige un hueco libre y asígnale el gráfico.
   Pinta el suelo en la capa 1, casas y árboles en la 2 y los detalles que van por encima (tejados, copas) en la 3.
4. **Eventos**: \`eventos/*.txt\` lista los comandos en el orden en que van en RPG Maker (Mostrar texto, Mostrar elecciones,
   Script…). Las banderas son **interruptores** y los contadores son **variables**, numerados desde el 100: revisa que estén libres en tu base.
5. **Entrenadores**: \`PBS/trainers_forja.txt\` (y crea el tipo de entrenador en \`trainertypes.txt\`).
6. Compatible con \`cable_club_pokemon_processor.py\` (lee \`GenderRate\`/\`GenderRatio\`, \`Abilities\`, \`Moves\` y \`Evolutions\`).
${issues.length ? '\n## Revisar\n\n' + [...new Set(issues)].map((i) => '- ' + i).join('\n') + '\n' : ''}`;

  E.essentials = () => {
    issues = [];
    const p = F.state.project, st = F.settings(), v16 = st.essVersion === 'v16', files = [];
    p.fakemons.forEach((m, i) => {
      const C = F.constName(m.name).replace(/_/g, ''), num = String(st.essFirstNum + i).padStart(3, '0');
      const front = F.find('sprites', m.sprites.front), back = F.find('sprites', m.sprites.back), icon = F.find('sprites', m.sprites.icon);
      const shiny = (s) => ({ ...s, palette: F.shinyOf(s.palette) });
      if (v16) {
        if (front) files.push({ name: `Graphics/Battlers/${num}.png`, data: png(front, [0], 'h', 3) }, { name: `Graphics/Battlers/${num}s.png`, data: png(shiny(front), [0], 'h', 3) });
        if (back) files.push({ name: `Graphics/Battlers/${num}b.png`, data: png(back, [0], 'h', 3) }, { name: `Graphics/Battlers/${num}sb.png`, data: png(shiny(back), [0], 'h', 3) });
        if (icon) files.push({ name: `Graphics/Icons/icon${num}.png`, data: png(icon, [0, icon.frames.length > 1 ? 1 : 0], 'h', 2) });
      } else {
        if (front) files.push({ name: `Graphics/Pokemon/Front/${C}.png`, data: png(front, [0], 'h', 3) }, { name: `Graphics/Pokemon/Front shiny/${C}.png`, data: png(shiny(front), [0], 'h', 3) });
        if (back) files.push({ name: `Graphics/Pokemon/Back/${C}.png`, data: png(back, [0], 'h', 3) }, { name: `Graphics/Pokemon/Back shiny/${C}.png`, data: png(shiny(back), [0], 'h', 3) });
        if (icon) files.push({ name: `Graphics/Pokemon/Icons/${C}.png`, data: png(icon, [0, icon.frames.length > 1 ? 1 : 0], 'h', 2) });
      }
      if (!front) note(`${m.name} no tiene sprite de frente.`);
    });
    if (p.fakemons.length) files.push({ name: 'PBS/pokemon_forja.txt', data: '# Generado por Forja GBA: pegar al final de PBS/pokemon.txt\r\n' + p.fakemons.map((m, i) => (v16 ? pbsV16(m, st.essFirstNum + i) : pbsV20(m))).join('\r\n') + '\r\n' });
    const tr = trainersEss(v16); if (tr) files.push({ name: 'PBS/trainers_forja.txt', data: tr + '\r\n' });
    p.sprites.forEach((s) => {
      const f = F.fileName(s.name);
      if (s.kind.startsWith('overworld') && s.frames.length >= 9) files.push({ name: `Graphics/Characters/${f}.png`, data: png(s, [0, 3, 0, 4, 2, 7, 2, 8, { f: 2, flip: true }, { f: 7, flip: true }, { f: 2, flip: true }, { f: 8, flip: true }, 1, 5, 1, 6], { cols: 4 }, 2) });
      if (s.kind === 'trainer') files.push({ name: v16 ? `Graphics/Characters/trainer_${F.constName(s.name)}.png` : `Graphics/Trainers/${F.constName(s.name)}.png`, data: png(s, [0], 'h', 2, { w: 80, h: 80 }) });
      if (s.kind === 'tileset') files.push({ name: `Graphics/Tilesets/${f}.png`, data: png(s, [0], 'h', 2) });
    });
    const ids = F.essIds();
    p.scripts.forEach((sc) => files.push({ name: `eventos/${F.fileName(sc.name)}.txt`, data: F.toEssentials(sc, { ids }).replace(/\n/g, '\r\n') + '\r\n' }));
    if (ids.switches.size || ids.vars.size) files.push({ name: 'eventos/INTERRUPTORES_Y_VARIABLES.txt', data: ['INTERRUPTORES', ...[...ids.switches].map(([k, v]) => `  ${String(v).padStart(4, '0')}  ${k}`), '', 'VARIABLES', ...[...ids.vars].map(([k, v]) => `  ${String(v).padStart(4, '0')}  ${k}`)].join('\r\n') + '\r\n' });
    files.push({ name: 'proyecto.forja.json', data: F.serialize() });
    files.unshift({ name: 'LEEME.md', data: readmeEss(v16) });
    return files;
  };
  Object.defineProperty(E, 'issues', { get: () => issues });

  /* =========================================================== vista */
  const settingsCard = () => {
    const st = F.settings(), upd = (k, num) => (e) => { st[k] = num ? (String(e.target.value).startsWith('0x') ? parseInt(e.target.value, 16) : +e.target.value) : e.target.value; F.scheduleAutosave(); E.render(); };
    return h('section', { class: 'card' }, h('h3', {}, 'Ajustes del hack'),
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', {}, 'Nombre del jugador (prueba)'), h('input', { id: 'set-player', value: st.player, maxlength: 7, onchange: upd('player') })),
        h('label', { class: 'field' }, h('span', {}, 'Nombre del rival (prueba)'), h('input', { id: 'set-rival', value: st.rival, maxlength: 7, onchange: upd('rival') }))),
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', {}, 'Offset de XSE (#dynamic)'), h('input', { id: 'set-dyn', value: st.dynamic, class: 'mono', onchange: upd('dynamic') })),
        h('label', { class: 'field' }, h('span', {}, 'Primera flag'), h('input', { id: 'set-flag', value: F.hex(st.firstFlag), class: 'mono', onchange: upd('firstFlag', true) })),
        h('label', { class: 'field' }, h('span', {}, 'Primera variable'), h('input', { id: 'set-var', value: F.hex(st.firstVar), class: 'mono', onchange: upd('firstVar', true) })),
        h('label', { class: 'field' }, h('span', {}, 'Letras por línea'), h('input', { id: 'set-width', type: 'number', min: 20, max: 40, class: 'num', value: st.lineWidth, onchange: upd('lineWidth', true) }))),
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', {}, 'Versión de Essentials'), h('select', { id: 'set-ess', onchange: upd('essVersion') }, h('option', { value: 'v16', selected: st.essVersion === 'v16' }, '16 a 19 (como el video y Cable Club)'), h('option', { value: 'v20', selected: st.essVersion === 'v20' }, '20 a 21'))),
        h('label', { class: 'field' }, h('span', {}, 'Primer número de Fakemon'), h('input', { id: 'set-num', type: 'number', min: 1, max: 9999, class: 'num', value: st.essFirstNum, onchange: upd('essFirstNum', true) }))),
      h('p', { class: 'hint' }, 'Valores de los tutoriales de Escuela ROM Hack: offset 0x800000, flags desde 0x200 y variables desde 0x7FFF hacia atrás. Prueba en el emulador que el progreso se guarda al reiniciar.'));
  };
  E.render = () => {
    if (F.state.view !== 'exportar') return;
    const p = F.state.project, root = $('#view');
    const T = {
      rom: ['ROM binaria · Advance Map + XSE', 'Como en los tutoriales de Escuela ROM Hack: scripts de XSE listos para compilar, guía de cada mapa para Advance Map, gráficos BMP de 16 colores y registro de flags y variables.', E.rom, '_rom_xse.zip', 'Descargar ZIP para ROM'],
      decomp: ['Decomp · pokeemerald-expansion (GBA)', 'El camino moderno: proyecto en C que se compila a la ROM. PNG indexados, datos de especie, mapas para Porymap, encuentros y Poryscript.', E.decomp, '_decomp.zip', 'Descargar ZIP decomp'],
      ess: ['Pokémon Essentials (RPG Maker XP)', 'Para juegos de PC como el del video. Sprites al tamaño de Essentials, PBS en el formato de tu versión y la lista de comandos de cada evento.', E.essentials, '_essentials.zip', 'Descargar ZIP Essentials'],
    };
    const [title, sub, fn, suffix, btn] = T[E.target];
    const files = fn(), iss = [...new Set(issues)];
    root.replaceChildren(h('div', { class: 'export' },
      h('header', { class: 'page-head' }, h('h2', {}, 'Exportar'), h('p', {}, 'Elige el motor de tu hack. Cada ZIP trae los archivos en sus carpetas y un LEEME con los pasos exactos.')),
      h('div', { class: 'seg big', role: 'tablist', 'aria-label': 'Destino' }, ...Object.entries(T).map(([k, v]) => h('button', { class: E.target === k ? 'sel' : '', role: 'tab', 'aria-selected': E.target === k ? 'true' : 'false', onclick: () => { E.target = k; E.render(); } }, v[0].split(' · ')[0].replace(' (RPG Maker XP)', '')))),
      h('div', { class: 'cards two' },
        h('section', { class: 'card export-card' }, h('h3', {}, title), h('p', {}, sub),
          h('div', { class: 'tree mono small' }, ...files.slice(0, 22).map((f) => h('div', {}, f.name)), files.length > 22 ? h('div', { class: 'muted' }, `… y ${files.length - 22} archivos más`) : null),
          iss.length ? h('div', { class: 'issues' }, h('b', {}, `Revisar (${iss.length})`), h('ul', {}, ...iss.slice(0, 10).map((i) => h('li', {}, i)))) : h('p', { class: 'ok' }, 'Todo listo para exportar.'),
          h('button', { class: 'btn primary', onclick: () => F.download(F.fileName(p.name) + suffix, F.zip(files)) }, btn)),
        settingsCard()),
      h('section', { class: 'card' }, h('h3', {}, 'Antes de distribuir'),
        h('p', {}, 'Trabaja siempre sobre una copia de la ROM y guarda versiones. Para compartir tu hack, distribuye un parche (.ips o .ups, por ejemplo con NUPS), nunca la ROM: las ROM originales tienen derechos de autor.'))));
  };
})();
