/* Forja GBA — traductores de eventos: Poryscript (decomp), XSE (ROM binaria con Advance Map) y comandos de Essentials. */
'use strict';
(() => {
  const F = window.F;

  /* ---------- utilidades comunes ---------- */
  const DIRS = { arriba: 'up', abajo: 'down', izquierda: 'left', derecha: 'right', up: 'up', down: 'down', left: 'left', right: 'right' };
  const DIR_ES = { up: 'Arriba', down: 'Abajo', left: 'Izquierda', right: 'Derecha' };
  F.parsePath = (path) => String(path || '').split(/[,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean).flatMap((p) => {
    const m = p.match(/^([a-záéíóú]+)\s*(?:[x×*]\s*(\d+))?$/i); if (!m || !DIRS[m[1]]) return [];
    return Array(F.clamp(+(m[2] || 1), 1, 20)).fill(DIRS[m[1]]);
  });
  const group = (dirs) => { const g = []; for (const d of dirs) { const l = g[g.length - 1]; if (l && l[0] === d) l[1]++; else g.push([d, 1]); } return g; };
  const walk = (steps, fn) => { for (const s of steps || []) { fn(s); walk(s.then, fn); walk(s.else, fn); (s.options || []).forEach((o) => walk(o.steps, fn)); } };
  F.walkSteps = walk;
  const monOf = (ref) => F.find('fakemons', ref);
  const monName = (ref) => (monOf(ref) || {}).name || ref || '???';
  const CMP = { '==': ['==', 0x1, '=='], '!=': ['!=', 0x5, '!='], '<': ['<', 0x0, '<'], '>': ['>', 0x2, '>'], '<=': ['<=', 0x3, '<='], '>=': ['>=', 0x4, '>='] };
  F.CMP_LABELS = [['==', 'es igual a'], ['!=', 'es distinta de'], ['>=', 'es mayor o igual que'], ['<=', 'es menor o igual que'], ['>', 'es mayor que'], ['<', 'es menor que']];

  /** Dónde se usa un evento (personaje, cartel, gatillo o al entrar al mapa) para elegir su cabecera. */
  F.scriptUse = (id) => {
    for (const m of F.state.project.maps) {
      if (m.onEnter === id) return { kind: 'level', map: m };
      for (const e of m.events) if (e.script === id) return { kind: e.type === 'trigger' ? 'trigger' : e.type === 'sign' ? 'sign' : 'npc', map: m, ev: e };
    }
    return { kind: 'npc' };
  };
  /** Número de persona en Advance Map: personajes y objetos se numeran en orden desde 1. */
  F.personNumber = (map, evId) => { const people = map.events.filter((e) => e.type === 'npc' || e.type === 'item'); const i = people.findIndex((e) => e.id === evId); return i < 0 ? 0 : i + 1; };
  const findEvent = (evId) => { for (const m of F.state.project.maps) { const e = m.events.find((x) => x.id === evId); if (e) return { map: m, ev: e }; } return null; };

  /* ---------- banderas y variables con número asignado ---------- */
  const FLAG_RANGES = [[0x200, 0x29f], [0x500, 0x79f], [0x1000, 0x109f]];
  F.romIds = () => {
    const p = F.state.project, st = F.settings(), flags = new Map(), vars = new Map();
    const addFlag = (n) => { if (n && !flags.has(n)) flags.set(n, null); };
    const addVar = (n) => { if (n && !vars.has(n)) vars.set(n, null); };
    p.scripts.forEach((sc) => walk(sc.steps, (s) => { if (s.flag) addFlag(s.flag); if (s.var) addVar(s.var); }));
    p.maps.forEach((m) => m.events.forEach((e) => { if (e.hideFlag) addFlag(e.hideFlag); if (e.type === 'item') addFlag(F.itemFlag(m, e)); if (e.type === 'trigger' && e.var) addVar(e.var); }));
    // banderas: desde la primera configurada, saltando a los siguientes rangos libres de Rojo Fuego
    let f = +st.firstFlag, r = Math.max(0, FLAG_RANGES.findIndex(([a, b]) => f >= a && f <= b));
    for (const k of flags.keys()) { while (FLAG_RANGES[r] && f > FLAG_RANGES[r][1]) { r++; f = FLAG_RANGES[r] ? FLAG_RANGES[r][0] : f; } flags.set(k, f++); }
    let v = +st.firstVar; const down = v >= 0x7000;
    for (const k of vars.keys()) { vars.set(k, v); v += down ? -1 : 1; }
    return { flags, vars };
  };
  /** Cada objeto en el suelo necesita su propia flag para no reaparecer. */
  F.itemFlag = (m, e) => 'OBJETO_' + F.constName(m.name) + '_' + (m.events.filter((x) => x.type === 'item').indexOf(e) + 1);
  F.essIds = () => {
    const ids = F.romIds(), sw = new Map(), vr = new Map(); let a = 100, b = 100;
    for (const k of ids.flags.keys()) sw.set(k, a++);
    for (const k of ids.vars.keys()) vr.set(k, b++);
    return { switches: sw, vars: vr };
  };
  F.romSpecies = (ref) => {
    const m = monOf(ref), slot = m && m.romSlot, hit = slot && (F.ROM_SPECIES || []).find(([n]) => n === slot);
    return hit ? { id: hit[1], ok: true, label: hit[0] } : { id: 0x1, ok: false, label: m ? m.name : String(ref || '') };
  };
  const romItem = (name) => {
    const key = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const id = (F.ROM_ITEMS || {})[key];
    return id != null ? { id, ok: true } : { id: 0x1, ok: false };
  };

  /* ---------- Poryscript (decomp) ---------- */
  const str = (t) => '"' + F.gbaClean(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\[player\]/g, '{PLAYER}').replace(/\[rival\]/g, '{RIVAL}').replace(/\n+/g, '\\p') + '"';
  const flagC = (f) => 'FLAG_' + F.constName(f);
  const varC = (v) => 'VAR_' + F.constName(v);
  const monC = (ref) => 'SPECIES_' + F.constName(monOf(ref) ? monOf(ref).name : ref || 'NONE');
  const mapC = (ref) => { const m = F.find('maps', ref); return 'MAP_' + F.constName(m ? m.name : ref || 'NONE'); };
  F.toPory = (script) => {
    if (!script) return '';
    const name = F.camel(script.name), lines = [], movs = [], use = F.scriptUse(script.id);
    let mi = 0;
    const objId = (target) => { if (target === 'self' || !target) return 'VAR_LAST_TALKED'; const f = findEvent(target); return f ? String(F.personNumber(f.map, target)) : 'VAR_LAST_TALKED'; };
    const emit = (steps, ind) => {
      const pad = '    '.repeat(ind);
      const ifElse = (cond, a, b) => { lines.push(`${pad}if (${cond}) {`); emit(a, ind + 1); if (b && b.length) { lines.push(`${pad}} else {`); emit(b, ind + 1); } lines.push(`${pad}}`); };
      for (const s of steps) {
        switch (s.op) {
          case 'msg': lines.push(`${pad}msgbox(format(${str(s.text)}))`); break;
          case 'ask': lines.push(`${pad}msgbox(format(${str(s.text)}), MSGBOX_YESNO)`); ifElse('var(VAR_RESULT) == YES', s.then, s.else); break;
          case 'choice': {
            // En GBA se pregunta opción por opción (sí/no) hasta que el jugador elige; funciona en cualquier base.
            lines.push(`${pad}while (TRUE) {`);
            if (s.text) lines.push(`${pad}    msgbox(format(${str(s.text)}))`);
            s.options.forEach((o) => { lines.push(`${pad}    msgbox(format(${str(o.ask || '¿' + o.label + '?')}), MSGBOX_YESNO)`, `${pad}    if (var(VAR_RESULT) == YES) {`); emit(o.steps, ind + 2); lines.push(`${pad}        break`, `${pad}    }`); });
            lines.push(`${pad}}`); break;
          }
          case 'if_flag': ifElse(`flag(${flagC(s.flag)})`, s.then, s.else); break;
          case 'if_var': ifElse(`var(${varC(s.var)}) ${(CMP[s.cmp] || CMP['=='])[0]} ${+s.value || 0}`, s.then, s.else); break;
          case 'set_flag': lines.push(`${pad}setflag(${flagC(s.flag)})`); break;
          case 'clear_flag': lines.push(`${pad}clearflag(${flagC(s.flag)})`); break;
          case 'set_var': lines.push(`${pad}setvar(${varC(s.var)}, ${+s.value || 0})`); break;
          case 'add_var': lines.push(`${pad}addvar(${varC(s.var)}, ${+s.value || 1})`); break;
          case 'give_item': lines.push(`${pad}giveitem(ITEM_${F.itemId(s.item).id}, ${+s.qty || 1})`); break;
          case 'give_mon': lines.push(`${pad}givemon(${monC(s.mon)}, ${+s.level || 5})`, `${pad}playfanfare(MUS_OBTAIN_ITEM)`, `${pad}msgbox(format(${str('¡Recibiste a ' + monName(s.mon) + '!')}))`, `${pad}waitfanfare`); break;
          case 'trainer': lines.push(`${pad}trainerbattle_single(TRAINER_${F.constName(s.name)}, ${str(s.intro)}, ${str(s.defeat)})`); break;
          case 'wild': lines.push(`${pad}setwildbattle(${monC(s.mon)}, ${+s.level || 5})`, `${pad}dowildbattle`); break;
          case 'heal': lines.push(`${pad}special(HealPlayerParty)`); break;
          case 'move': {
            const label = `${name}_Mov${++mi}`;
            movs.push(`movement ${label} {\n${group(F.parsePath(s.path)).map(([d, n]) => `    walk_${d}${n > 1 ? ' * ' + n : ''}`).join('\n')}\n}`);
            lines.push(`${pad}applymovement(${s.who === 'player' ? 'OBJ_EVENT_ID_PLAYER' : objId(s.who)}, ${label})`, `${pad}waitmovement(0)`); break;
          }
          case 'hide_npc': { const f = s.target === 'self' ? use.ev : findEvent(s.target)?.ev; if (f && f.hideFlag) lines.push(`${pad}setflag(${flagC(f.hideFlag)})`); lines.push(`${pad}removeobject(${objId(s.target)})`); break; }
          case 'show_npc': { const f = findEvent(s.target)?.ev; if (f && f.hideFlag) lines.push(`${pad}clearflag(${flagC(f.hideFlag)})`); lines.push(`${pad}addobject(${objId(s.target)})`); break; }
          case 'warp': lines.push(`${pad}warp(${mapC(s.map)}, ${+s.x || 0}, ${+s.y || 0})`); break;
          case 'wait': lines.push(`${pad}delay(${+s.frames || 30})`); break;
          default: break;
        }
      }
    };
    emit(script.steps, 1);
    const auto = use.kind === 'trigger' || use.kind === 'level';
    const head = auto ? '    lockall' : use.kind === 'sign' ? '' : '    lock\n    faceplayer';
    const tail = auto ? '    releaseall\n    end' : use.kind === 'sign' ? '    end' : '    release\n    end';
    return `script ${name} {\n${head ? head + '\n' : ''}${lines.join('\n')}\n${tail}\n}` + (movs.length ? '\n\n' + movs.join('\n\n') : '');
  };
  F.scriptFlags = (steps, out = new Set()) => { walk(steps, (s) => { if (s.flag) out.add(flagC(s.flag)); }); return out; };

  /* ---------- XSE (ROM binaria de Rojo Fuego con Advance Map) ---------- */
  const FR_MOVE = { down: 0x10, up: 0x11, left: 0x12, right: 0x13 };
  F.toXSE = (script, opts = {}) => {
    if (!script) return '';
    const ids = opts.ids || F.romIds(), st = F.settings(), use = F.scriptUse(script.id), notes = [];
    const base = (F.constName(script.name).toLowerCase().replace(/_/g, '').slice(0, 8) || 'ev') + (F.state.project.scripts.indexOf(script) + 1);
    const blocks = [], texts = [], movs = []; let n = 0;
    const block = (name) => { const b = { name, lines: [] }; blocks.push(b); return b; };
    let cur = block(base);
    const say = (t) => { const k = `${base}_t${texts.length + 1}`; texts.push([k, F.xseText(t)]); return k; };
    const H = F.hex;
    const flagH = (f) => H(ids.flags.get(f) ?? st.firstFlag);
    const varH = (v) => H(ids.vars.get(v) ?? st.firstVar);
    const person = (target) => { if (target === 'self' || !target) return '0x800F'; const f = findEvent(target); return f ? H(F.personNumber(f.map, target)) : '0x800F'; };
    const branch = (condLines, a, b, code = '0x1') => {
      const k = ++n, yes = `${base}_si${k}`, cont = `${base}_sig${k}`;
      cur.lines.push(...condLines, `if ${code} goto @${yes}`);
      emit(b || []); cur.lines.push(`goto @${cont}`);
      cur = block(yes); emit(a || []); cur.lines.push(`goto @${cont}`);
      cur = block(cont);
    };
    let menuOn = false;
    const emit = (steps) => {
      for (const s of steps) {
        const L = cur.lines;
        switch (s.op) {
          case 'msg': L.push(`msgbox @${say(F.fillNamesXSE(s.text))} ${use.kind === 'sign' ? '0x3' : '0x6'}`); break;
          case 'ask': L.push(`msgbox @${say(F.fillNamesXSE(s.text))} 0x5`); branch(['compare LASTRESULT 0x1'], s.then, s.else); break;
          case 'choice': {
            const k = ++n, loop = `${base}_elige${k}`, cont = `${base}_sig${k}`;
            L.push(`goto @${loop}`); cur = block(loop);
            if (s.text) cur.lines.push(`msgbox @${say(F.fillNamesXSE(s.text))} 0x6`);
            s.options.forEach((o, i) => cur.lines.push(`msgbox @${say(F.fillNamesXSE(o.ask || '¿' + o.label + '?'))} 0x5`, 'compare LASTRESULT 0x1', `if 0x1 goto @${base}_op${k}_${i + 1}`));
            cur.lines.push(`goto @${loop}`);
            s.options.forEach((o, i) => { cur = block(`${base}_op${k}_${i + 1}`); emit(o.steps); cur.lines.push(`goto @${cont}`); });
            cur = block(cont); break;
          }
          case 'if_flag': branch([`checkflag ${flagH(s.flag)}`], s.then, s.else); break;
          case 'if_var': branch([`compare ${varH(s.var)} ${H(+s.value || 0)}`], s.then, s.else, H((CMP[s.cmp] || CMP['=='])[1])); break;
          case 'set_flag': L.push(`setflag ${flagH(s.flag)}`); break;
          case 'clear_flag': L.push(`clearflag ${flagH(s.flag)}`); break;
          case 'set_var': L.push(`setvar ${varH(s.var)} ${H(+s.value || 0)}`); break;
          case 'add_var': L.push(`addvar ${varH(s.var)} ${H(+s.value || 1)}`); break;
          case 'give_item': { const it = romItem(s.item); if (!it.ok) notes.push(`Objeto “${s.item}” no está en la lista de XSE: revisa su número.`); L.push(`giveitem ${H(it.id)} ${H(+s.qty || 1)} 0x0`); break; }
          case 'give_mon': {
            const sp = F.romSpecies(s.mon); if (!sp.ok) notes.push(`${sp.label}: elige en Fakemon → “Ocupa el lugar de” qué especie de la ROM reemplaza.`);
            L.push(`givepokemon ${H(sp.id)} ${H(+s.level || 5)} 0x0 0x0 0x0 0x0`, 'fanfare 0x13E', `msgbox @${say('¡Recibiste a ' + monName(s.mon) + '!')} 0x4`, 'waitfanfare', 'closeonkeypress');
            if (!menuOn && st.romBase === 'BPRE') { L.push("setflag 0x828 ' activa el menú Pokémon (Rojo Fuego)"); menuOn = true; }
            break;
          }
          case 'trainer': L.push(`trainerbattle 0x0 ${H(+s.trainerId || 1)} 0x0 @${say(F.fillNamesXSE(s.intro))} @${say(F.fillNamesXSE(s.defeat))}`); notes.push(`Entrenador “${s.name}”: edita el equipo del entrenador ${H(+s.trainerId || 1)} con PET o Advance Trainer.`); break;
          case 'wild': { const sp = F.romSpecies(s.mon); L.push(`wildbattle ${H(sp.id)} ${H(+s.level || 5)} 0x0`); break; }
          case 'heal': L.push('special 0x0'); break;
          case 'move': {
            const k = `${base}_mov${movs.length + 1}`; movs.push([k, F.parsePath(s.path)]);
            L.push(`applymovement ${s.who === 'player' ? '0xFF' : person(s.who)} @${k}`, 'waitmovement 0x0'); break;
          }
          case 'hide_npc': { const f = s.target === 'self' ? use.ev : findEvent(s.target)?.ev; L.push(`hidesprite ${person(s.target)}`); if (f && f.hideFlag) L.push(`setflag ${flagH(f.hideFlag)}`); break; }
          case 'show_npc': { const f = findEvent(s.target)?.ev; if (f && f.hideFlag) L.push(`clearflag ${flagH(f.hideFlag)}`); L.push(`showsprite ${person(s.target)}`); break; }
          case 'warp': { const m = F.find('maps', s.map); L.push(`warp ${H(m ? m.bank : 3)} ${H(m ? m.num : 0)} 0xFF ${H(+s.x || 0)} ${H(+s.y || 0)}`); break; }
          case 'wait': L.push(`pause ${H(+s.frames || 30)}`); break;
          default: break;
        }
      }
    };
    emit(script.steps);
    const auto = use.kind === 'trigger' || use.kind === 'level';
    blocks[0].lines.unshift(...(auto ? ['lockall'] : use.kind === 'sign' ? [] : ['lock', 'faceplayer']));
    cur.lines.push(...(auto ? ['releaseall'] : use.kind === 'sign' ? [] : ['release']), 'end');
    const out = [`' ${script.name} — generado por Forja GBA`, `#dynamic ${st.dynamic}`, ''];
    blocks.forEach((b) => out.push(`#org @${b.name}`, ...b.lines, ''));
    texts.forEach(([k, t]) => out.push(`#org @${k}`, `= ${t}`, ''));
    movs.forEach(([k, dirs]) => out.push(`#org @${k}`, ...dirs.map((d) => `#raw ${H(FR_MOVE[d])} ' ${DIR_ES[d]}`), '#raw 0xFE', ''));
    if (opts.notes) opts.notes.push(...notes.map((x) => `${script.name}: ${x}`));
    return out.join('\n');
  };
  F.fillNamesXSE = (t) => String(t || '');

  /* ---------- Pokémon Essentials: lista de comandos de evento (RPG Maker XP) ---------- */
  const essId = (s) => String(s || '').replace(/_/g, '');
  F.toEssentials = (script, opts = {}) => {
    if (!script) return '';
    const st = F.settings(), v16 = st.essVersion === 'v16', ids = opts.ids || F.essIds(), out = [];
    const sw = (f) => String(ids.switches.get(f) ?? 100).padStart(4, '0');
    const vr = (v) => String(ids.vars.get(v) ?? 100).padStart(4, '0');
    const species = (ref) => ':' + F.constName(monOf(ref) ? monOf(ref).name : ref || 'NONE');
    const txt = (t) => F.fillNames(String(t || '').replace(/\[player\]/gi, '\\PN')).replace(/\n/g, ' ');
    const emit = (steps, d) => {
      const p = '  '.repeat(d) + '@>';
      const p2 = '  '.repeat(d) + ' : ';
      for (const s of steps) {
        switch (s.op) {
          case 'msg': out.push(`${p}Texto: ${txt(s.text)}`); break;
          case 'ask': out.push(`${p}Texto: ${txt(s.text)}`, `${p}Mostrar elecciones: Sí, No`, `${p2}Cuando [Sí]`); emit(s.then, d + 1); out.push(`${p2}Cuando [No]`); emit(s.else, d + 1); out.push(`${p2}Fin de la rama`); break;
          case 'choice': if (s.text) out.push(`${p}Texto: ${txt(s.text)}`); out.push(`${p}Mostrar elecciones: ${s.options.map((o) => o.label).join(', ')}`); s.options.forEach((o) => { out.push(`${p2}Cuando [${o.label}]`); emit(o.steps, d + 1); }); out.push(`${p2}Fin de la rama`); break;
          case 'if_flag': out.push(`${p}Condición: Interruptor [${sw(s.flag)}: ${s.flag}] == ON`); emit(s.then, d + 1); out.push(`${p2}Si no`); emit(s.else, d + 1); out.push(`${p2}Fin de la condición`); break;
          case 'if_var': out.push(`${p}Condición: Variable [${vr(s.var)}: ${s.var}] ${s.cmp || '=='} ${+s.value || 0}`); emit(s.then, d + 1); out.push(`${p2}Si no`); emit(s.else, d + 1); out.push(`${p2}Fin de la condición`); break;
          case 'set_flag': out.push(`${p}Operación de interruptor: [${sw(s.flag)}: ${s.flag}] = ON`); break;
          case 'clear_flag': out.push(`${p}Operación de interruptor: [${sw(s.flag)}: ${s.flag}] = OFF`); break;
          case 'set_var': out.push(`${p}Operación de variable: [${vr(s.var)}: ${s.var}] = ${+s.value || 0}`); break;
          case 'add_var': out.push(`${p}Operación de variable: [${vr(s.var)}: ${s.var}] += ${+s.value || 1}`); break;
          case 'give_item': out.push(`${p}Script: ${v16 ? 'Kernel.pbReceiveItem' : 'pbReceiveItem'}(:${essId(F.itemId(s.item).id)},${+s.qty || 1})`); break;
          case 'give_mon': out.push(`${p}Script: pbAddPokemon(${species(s.mon)},${+s.level || 5})`); break;
          case 'trainer': out.push(`${p}Texto: ${txt(s.intro)}`, `${p}Script: ${v16 ? `pbTrainerBattle(:${F.constName(s.name)},"${s.name}",_I("${txt(s.defeat)}"))` : `TrainerBattle.start(:${F.constName(s.name)}, "${s.name}")`}`); break;
          case 'wild': out.push(`${p}Script: ${v16 ? 'pbWildBattle' : 'WildBattle.start'}(${species(s.mon)},${+s.level || 5})`); break;
          case 'heal': out.push(`${p}Script: ${v16 ? 'for i in $Trainer.party; i.heal; end' : '$player.heal_party'}`); break;
          case 'move': out.push(`${p}Mover ruta: ${s.who === 'player' ? 'Jugador' : 'Este evento'} (Esperar a completar)`, ...group(F.parsePath(s.path)).map(([dir, k]) => `${'  '.repeat(d)} :          $>Mover ${DIR_ES[dir].toLowerCase()}${k > 1 ? ' ×' + k : ''}`)); break;
          case 'hide_npc': out.push(`${p}Operación de interruptor local: A = ON   (en la página 2 del evento: sin gráfico)`); break;
          case 'show_npc': out.push(`${p}Operación de interruptor local: A = OFF`); break;
          case 'warp': { const m = F.find('maps', s.map); out.push(`${p}Transferir jugador: [${m ? m.name : '?'}], (${+s.x || 0},${+s.y || 0})`); break; }
          case 'wait': out.push(`${p}Esperar: ${+s.frames || 30} frames`); break;
          default: break;
        }
      }
    };
    emit(script.steps, 0);
    out.push('@>');
    return `# ${script.name}\n` + out.join('\n');
  };
})();
