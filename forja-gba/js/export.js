/* Forja GBA — Exportación: proyecto decomp (pokeemerald-expansion) y Pokémon Essentials. */
'use strict';
(() => {
  const F = window.F, { h, $ } = F;
  const E = (F.exporter = {});
  const png = (sprite, order, layout = 'h', scale = 1, cell = null) => { const s = F.sheet(sprite, order, layout, scale, cell); return F.encodePNG(s.px, s.w, s.h, sprite.palette); };
  const all = (s) => s.frames.map((_, i) => i);
  const issues = [];
  const note = (msg) => issues.push(msg);

  /* ---------- decomp GBA ---------- */
  const speciesInfo = (m, p) => {
    const C = F.constName(m.name), Cm = F.camel(m.name);
    const ab = [m.abilities[0], m.abilities[1], m.hidden].map((a) => { const r = F.abilityId(a); if (!r.known) note(`Habilidad “${a}” de ${m.name}: revisa ABILITY_${r.id}.`); return r.id ? 'ABILITY_' + r.id : 'ABILITY_NONE'; });
    const types = m.types.filter(Boolean); const t2 = types[1] || types[0];
    const egg = m.eggGroups.filter(Boolean); const e2 = egg[1] || egg[0];
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
        .speciesName = _("${m.name.slice(0, 12)}"),
        .cryId = CRY_NONE,
        .natDexNum = NATIONAL_DEX_NONE,
        .categoryName = _("${(m.category || '').replace(/"/g, '')}"),
        .height = ${Math.round(m.height * 10)},
        .weight = ${Math.round(m.weight * 10)},
        .description = COMPOUND_STRING(
            "${(m.dex || 'Sin descripción.').replace(/"/g, '').replace(/\n/g, ' ')}"),
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
  /* Desplazamiento vertical: cuántas filas vacías hay bajo el sprite de frente. */
  const frontYOffset = (s) => { const f = s.frames[0]; for (let y = s.h - 1; y >= 0; y--) for (let x = 0; x < s.w; x++) if (f[y * s.w + x]) return s.h - 1 - y; return 0; };
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
  const trainersParty = (p) => {
    const out = [];
    const walk = (steps) => { for (const s of steps || []) { if (s.op === 'trainer') out.push(s); walk(s.then); walk(s.else); } };
    p.scripts.forEach((s) => walk(s.steps));
    return out.map((t) => { const mon = F.find('fakemons', t.mon); return `=== TRAINER_${F.constName(t.name)} ===\nName: ${t.name}\nClass: Rival\nPic: Brendan\nGender: Male\nMusic: Male\nDouble Battle: No\nAI: Check Bad Move\n\n${mon ? mon.name : 'Poochyena'}\nLevel: ${t.level || 5}\n`; }).join('\n');
  };
  /* map.bin: u16 por bloque = metatile (10 bits) | colisión (2 bits) | elevación (4 bits). */
  const mapBin = (m) => { const buf = new Uint8Array(m.w * m.h * 2); for (let i = 0; i < m.w * m.h; i++) { const v = (m.bottom[i] & 0x3ff) | ((m.coll[i] ? 1 : 0) << 10) | (3 << 12); buf[i * 2] = v & 255; buf[i * 2 + 1] = v >> 8; } return buf; };
  const mapJson = (m, p) => {
    const C = F.camel(m.name);
    const objs = m.events.filter((e) => e.type === 'npc' || e.type === 'item').map((e, i) => ({
      graphics_id: e.type === 'item' ? 'OBJ_EVENT_GFX_ITEM_BALL' : 'OBJ_EVENT_GFX_' + F.constName((F.find('sprites', e.sprite) || { name: 'BOY_1' }).name), x: e.x, y: e.y, elevation: 3,
      movement_type: e.type === 'item' ? 'MOVEMENT_TYPE_LOOK_AROUND' : ({ quieto: 'MOVEMENT_TYPE_FACE_' + (e.facing || 'down').toUpperCase(), mirar: 'MOVEMENT_TYPE_LOOK_AROUND', pasear: 'MOVEMENT_TYPE_WANDER_AROUND' })[e.movement || 'quieto'],
      movement_range_x: e.movement === 'pasear' ? 2 : 0, movement_range_y: e.movement === 'pasear' ? 2 : 0, trainer_type: 'TRAINER_TYPE_NONE', trainer_sight_or_berry_tree_id: e.type === 'item' ? 'ITEM_' + F.itemId(e.item).id : '0',
      script: e.type === 'item' ? 'Common_EventScript_FindItem' : (F.find('scripts', e.script) ? F.camel(F.find('scripts', e.script).name) : '0x0'), flag: e.type === 'item' ? 'FLAG_ITEM_' + F.constName(m.name + '_' + (i + 1)) : '0',
    }));
    return JSON.stringify({
      id: 'MAP_' + F.constName(m.name), name: C, layout: 'LAYOUT_' + F.constName(m.name), music: m.music || 'MUS_LITTLEROOT', region_map_section: 'MAPSEC_LITTLEROOT_TOWN',
      requires_flash: false, weather: 'WEATHER_' + (m.weather || 'NONE'), map_type: 'MAP_TYPE_TOWN', allow_cycling: true, allow_escaping: false, allow_running: true, show_map_name: true, battle_scene: 'MAP_BATTLE_SCENE_NORMAL',
      connections: null, object_events: objs,
      warp_events: m.events.filter((e) => e.type === 'warp').map((e) => ({ x: e.x, y: e.y, elevation: 0, dest_map: 'MAP_' + F.constName((F.find('maps', e.toMap) || { name: 'NONE' }).name), dest_warp_id: '0' })),
      coord_events: [], bg_events: m.events.filter((e) => e.type === 'sign').map((e) => ({ type: 'sign', x: e.x, y: e.y, elevation: 0, player_facing_dir: 'BG_EVENT_PLAYER_FACING_ANY', script: F.find('scripts', e.script) ? F.camel(F.find('scripts', e.script).name) : '0x0' })),
    }, null, 2);
  };

  const readme = (p, kind) => `# ${p.name} — exportado con Forja GBA (${new Date().toLocaleDateString('es')})

${kind === 'decomp' ? `Formato: proyecto **decomp** (pokeemerald-expansion). Copia cada carpeta sobre tu proyecto y compila con \`make\`.

## Pasos para integrar

1. **Gráficos de Fakemon** → \`graphics/pokemon/<nombre>/\`: \`anim_front.png\` (2 cuadros de 64×64 apilados),
   \`back.png\`, \`icon.png\` (32×64), \`normal.pal\` y \`shiny.pal\`. El build los convierte a 4bpp solo.
2. **Datos** → \`src/data/pokemon/forja/\`: pega el contenido de \`species_info.h\` dentro de \`gSpeciesInfo\`,
   los learnsets en \`level_up_learnsets\` y las declaraciones de \`graphics.h\` en \`src/data/graphics/pokemon.h\`.
   En \`include/constants/species.h\` define \`SPECIES_FORJA_START\` como el número siguiente a tu última especie,
   pega \`species_constants.h\` y mueve \`SPECIES_EGG\` detrás de tus Fakemon.
3. **Personajes del mapa** → \`graphics/object_events/pics/people/\`. Cada hoja tiene 9 cuadros en el orden del juego
   (abajo, arriba, izquierda, 2 pasos abajo, 2 arriba, 2 izquierda). Regístralos en \`object_event_graphics_info.h\`.
4. **Mapas** → ábrelos con **Porymap**: \`data/layouts/<Mapa>/map.bin\` usa el índice de bloque de tu tileset
   (importa \`tileset.png\` en Porymap como tileset secundario y conserva el orden). \`map.json\` trae los eventos.
5. **Eventos** → \`data/maps/<Mapa>/scripts.pory\` y \`data/scripts/forja.pory\` (necesitas Poryscript, ya viene en expansion).
6. **Entrenadores** → añade \`trainers.party\` a \`src/data/trainers.party\`.
7. **Banderas** usadas: ${[...p.scripts.reduce((s, sc) => F.scriptFlags(sc.steps, s), new Set())].join(', ') || 'ninguna'}.
   Defínelas en \`include/constants/flags.h\` reutilizando banderas \`FLAG_UNUSED_*\`.

> Los nombres de campos cambian entre versiones de expansion. Si el compilador marca un campo, compáralo con un Pokémon
> existente de tu versión (por ejemplo \`src/data/pokemon/species_info/gen_1_families.h\`).` : `Formato: **Pokémon Essentials** (v20/v21). Copia \`Graphics/\` y \`PBS/\` en la carpeta del juego.

1. \`PBS/pokemon_forja.txt\`: pega las entradas al final de \`PBS/pokemon.txt\` y recompila (Ctrl+F8 o al iniciar en modo debug).
2. Sprites ampliados ×2 (personajes y entrenadores) y ×3 (Pokémon de 64 px → 192 px), como espera Essentials.
3. Los personajes van como hoja de 4×4 (abajo, izquierda, derecha, arriba).
4. Compatible con \`cable_club_pokemon_processor.py\`: usa \`GenderRatio\`, \`Abilities\`, \`HiddenAbilities\`, \`Moves\` y \`Evolutions\`.`}
${issues.length ? '\n## Revisar antes de compilar\n\n' + [...new Set(issues)].map((i) => '- ' + i).join('\n') + '\n' : ''}`;

  E.decomp = () => {
    issues.length = 0;
    const p = F.state.project, files = [];
    p.fakemons.forEach((m) => {
      const f = F.fileName(m.name), base = `graphics/pokemon/${f}/`;
      const front = F.find('sprites', m.sprites.front), back = F.find('sprites', m.sprites.back), icon = F.find('sprites', m.sprites.icon);
      if (front) {
        files.push({ name: base + 'anim_front.png', data: png(front, [0, front.frames.length > 1 ? 1 : 0], 'v') }, { name: base + 'front.png', data: png(front, [0]) });
        files.push({ name: base + 'normal.pal', data: F.jascPal(front.palette) }, { name: base + 'shiny.pal', data: F.jascPal(F.shinyOf(front.palette)) });
      } else note(`${m.name} no tiene sprite de frente.`);
      if (back) { files.push({ name: base + 'back.png', data: png({ ...back, palette: front ? front.palette : back.palette }, [0]) }); if (front && back.palette.join() !== front.palette.join()) note(`${m.name}: la espalda usa otra paleta; en GBA frente y espalda comparten la del frente.`); }
      else note(`${m.name} no tiene sprite de espalda.`);
      if (icon) files.push({ name: base + 'icon.png', data: png(icon, [0, icon.frames.length > 1 ? 1 : 0], 'v') }); else note(`${m.name} no tiene ícono.`);
    });
    if (p.fakemons.length) {
      files.push({ name: 'src/data/pokemon/forja/species_info.h', data: '// Pegar dentro de gSpeciesInfo[]\n\n' + p.fakemons.map((m) => speciesInfo(m, p)).join('\n\n') + '\n' });
      files.push({ name: 'src/data/pokemon/forja/learnsets.h', data: p.fakemons.map(learnset).join('\n') });
      files.push({ name: 'src/data/pokemon/forja/graphics.h', data: p.fakemons.map(graphicsDecl).join('\n') });
      files.push({ name: 'src/data/pokemon/forja/species_constants.h', data: p.fakemons.map((m, i) => `#define SPECIES_${F.constName(m.name)} (SPECIES_FORJA_START + ${i})`).join('\n') + '\n' });
    }
    p.sprites.forEach((s) => {
      const f = F.fileName(s.name);
      if (s.kind.startsWith('overworld')) { files.push({ name: `graphics/object_events/pics/people/${f}.png`, data: png(s, all(s).slice(0, 9)) }, { name: `graphics/object_events/palettes/${f}.pal`, data: F.jascPal(s.palette) }); if (s.frames.length !== 9) note(`${s.name}: un personaje del mapa necesita 9 cuadros (tiene ${s.frames.length}).`); }
      if (s.kind === 'trainer') files.push({ name: `graphics/trainers/front_pics/${f}.png`, data: png(s, [0]) }, { name: `graphics/trainers/palettes/${f}.pal`, data: F.jascPal(s.palette) });
      if (s.kind === 'tileset') files.push({ name: `data/tilesets/secondary/${f}/tiles.png`, data: png(s, [0]) }, { name: `data/tilesets/secondary/${f}/palettes/00.pal`, data: F.jascPal(s.palette) });
    });
    p.maps.forEach((m) => {
      const C = F.camel(m.name);
      files.push({ name: `data/layouts/${C}/map.bin`, data: mapBin(m) }, { name: `data/maps/${C}/map.json`, data: mapJson(m, p) });
      const used = new Set(m.events.map((e) => e.script).filter(Boolean));
      const scr = p.scripts.filter((s) => used.has(s.id)).map((s) => F.toPory(s)).join('\n\n');
      files.push({ name: `data/maps/${C}/scripts.pory`, data: `mapscripts ${C}_MapScripts {}\n\n${scr}\n` });
      if (m.top.some((v) => v >= 0)) note(`${m.name}: la capa “Encima” se exporta solo en la vista previa; en Porymap úsala con bloques de capa superior del tileset.`);
    });
    if (p.scripts.length) files.push({ name: 'data/scripts/forja.pory', data: p.scripts.map((s) => F.toPory(s)).join('\n\n') + '\n' });
    const party = trainersParty(p); if (party) files.push({ name: 'src/data/trainers_forja.party', data: party });
    files.push({ name: 'proyecto.forja.json', data: F.serialize() });
    files.unshift({ name: 'LEEME.md', data: readme(p, 'decomp') });
    return files;
  };

  /* ---------- Pokémon Essentials ---------- */
  const pbs = (m) => {
    const ess = (list, v) => (list.find((x) => x[0] === v) || [])[2];
    const ab = [m.abilities[0], m.abilities[1]].filter(Boolean).map((a) => F.abilityId(a).id);
    const into = F.find('fakemons', m.evo.into);
    const evoParam = m.evo.method === 'LEVEL' ? m.evo.param : m.evo.method === 'ITEM' ? ess(F.STONES, m.evo.param) : '';
    return [
      '#-------------------------------', `[${F.constName(m.name)}]`, `Name = ${m.name}`, `Types = ${m.types.filter(Boolean).join(',')}`,
      `BaseStats = ${m.stats.hp},${m.stats.atk},${m.stats.def},${m.stats.spe},${m.stats.spa},${m.stats.spd}`,
      `GenderRatio = ${ess(F.GENDERS, m.genderFemale) || 'Female50Percent'}`, `GrowthRate = ${ess(F.GROWTH, m.growth)}`, `BaseExp = ${m.expYield}`, `CatchRate = ${m.catchRate}`, 'Happiness = 70',
      ab.length ? `Abilities = ${ab.join(',')}` : null, m.hidden ? `HiddenAbilities = ${F.abilityId(m.hidden).id}` : null,
      `Moves = ${m.learnset.filter((l) => l.move).sort((a, b) => a.lvl - b.lvl).map((l) => `${l.lvl},${F.moveId(l.move).id}`).join(',')}`,
      `EggGroups = ${m.eggGroups.filter(Boolean).map((e) => ess(F.EGG_GROUPS, e)).join(',')}`, 'HatchSteps = 5120', `Height = ${m.height}`, `Weight = ${m.weight}`,
      `Color = ${ess(F.COLORS, m.color)}`, `Category = ${m.category}`, `Pokedex = ${(m.dex || '').replace(/\n/g, ' ')}`, 'Generation = 9',
      into ? `Evolutions = ${F.constName(into.name)},${ess(F.EVO_METHODS, m.evo.method)},${evoParam}` : null,
    ].filter((x) => x != null).join('\n');
  };
  E.essentials = () => {
    issues.length = 0;
    const p = F.state.project, files = [];
    p.fakemons.forEach((m) => {
      const C = F.constName(m.name), front = F.find('sprites', m.sprites.front), back = F.find('sprites', m.sprites.back), icon = F.find('sprites', m.sprites.icon);
      if (front) { files.push({ name: `Graphics/Pokemon/Front/${C}.png`, data: png(front, [0], 'h', 3) }, { name: `Graphics/Pokemon/Front shiny/${C}.png`, data: png({ ...front, palette: F.shinyOf(front.palette) }, [0], 'h', 3) }); }
      if (back) { files.push({ name: `Graphics/Pokemon/Back/${C}.png`, data: png(back, [0], 'h', 3) }, { name: `Graphics/Pokemon/Back shiny/${C}.png`, data: png({ ...back, palette: F.shinyOf(back.palette) }, [0], 'h', 3) }); }
      if (icon) files.push({ name: `Graphics/Pokemon/Icons/${C}.png`, data: png(icon, [0, icon.frames.length > 1 ? 1 : 0], 'h', 2) });
    });
    if (p.fakemons.length) files.push({ name: 'PBS/pokemon_forja.txt', data: '# Entradas generadas por Forja GBA — pegar al final de PBS/pokemon.txt\n' + p.fakemons.map(pbs).join('\n') + '\n' });
    p.sprites.forEach((s) => {
      const f = F.fileName(s.name);
      if (s.kind.startsWith('overworld') && s.frames.length >= 9) {
        // Essentials: filas abajo, izquierda, derecha, arriba; columnas quieto, paso, quieto, paso
        const order = [0, 3, 0, 4, 2, 7, 2, 8, { f: 2, flip: true }, { f: 7, flip: true }, { f: 2, flip: true }, { f: 8, flip: true }, 1, 5, 1, 6];
        files.push({ name: `Graphics/Characters/${f}.png`, data: png(s, order, { cols: 4 }, 2) });
      }
      if (s.kind === 'trainer') files.push({ name: `Graphics/Trainers/${F.constName(s.name)}.png`, data: png(s, [0], 'h', 2, { w: 80, h: 80 }) });
      if (s.kind === 'tileset') files.push({ name: `Graphics/Tilesets/${f}.png`, data: png(s, [0], 'h', 2) });
    });
    files.push({ name: 'proyecto.forja.json', data: F.serialize() });
    files.unshift({ name: 'LEEME.md', data: readme(p, 'essentials') });
    return files;
  };
  E.issues = issues;

  /* ---------- vista ---------- */
  E.render = () => {
    if (F.state.view !== 'exportar') return;
    const p = F.state.project, root = $('#view');
    const decompFiles = E.decomp(), decompIssues = [...new Set(issues)];
    const essFiles = E.essentials();
    const card = (title, sub, files, iss, fname, desc) => h('section', { class: 'card export-card' },
      h('h3', {}, title), h('p', {}, sub),
      h('div', { class: 'tree mono small' }, ...files.slice(0, 18).map((f) => h('div', {}, f.name)), files.length > 18 ? h('div', { class: 'muted' }, `… y ${files.length - 18} archivos más`) : null),
      iss.length ? h('div', { class: 'issues' }, h('b', {}, `Revisar (${iss.length})`), h('ul', {}, ...iss.slice(0, 8).map((i) => h('li', {}, i)))) : h('p', { class: 'ok' }, 'Todo listo para exportar.'),
      h('button', { class: 'btn primary', onclick: () => F.download(fname, F.zip(files)) }, desc));
    root.replaceChildren(h('div', { class: 'export' },
      h('header', { class: 'page-head' }, h('h2', {}, 'Exportar'), h('p', {}, 'Elige el motor de tu hack. Cada ZIP trae los archivos en sus carpetas y un LEEME con los pasos exactos.')),
      h('div', { class: 'cards two' },
        card('GBA · decomp (pokeemerald-expansion)', 'El camino moderno para hacer un hack de GBA: proyecto en C que se compila a una ROM .gba. Gráficos PNG indexados de 16 colores, datos de especie, mapas para Porymap y eventos en Poryscript.', decompFiles, decompIssues, F.fileName(p.name) + '_decomp.zip', 'Descargar ZIP decomp'),
        card('Pokémon Essentials (RPG Maker XP)', 'Para juegos de PC hechos con Essentials, como los sprites que ya tienes. Sprites ampliados al tamaño que espera Essentials y entradas PBS.', essFiles, [...new Set(issues)], F.fileName(p.name) + '_essentials.zip', 'Descargar ZIP Essentials')),
      h('section', { class: 'card' }, h('h3', {}, 'Sobre las ROM .gba ya compiladas'),
        h('p', {}, 'Forja GBA no escribe directamente dentro de una ROM .gba (lo que hacen herramientas antiguas como Advance Map). Editar una ROM binaria es frágil: un puntero mal movido la corrompe. El flujo decomp hace lo mismo de forma segura: editas archivos, compilas y obtienes la ROM. Para distribuir tu hack, comparte un parche (.bps/.ups), nunca la ROM.'))));
  };
})();
