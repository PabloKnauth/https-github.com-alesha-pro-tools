/* Forja GBA — Editor de eventos (mecánicas) por bloques y generador de Poryscript. */
'use strict';
(() => {
  const F = window.F, { h, $ } = F;
  const S = (F.events = { id: null });
  const cur = () => F.find('scripts', S.id);
  const save = () => { F.state.dirty = true; F.scheduleAutosave(); const code = $('#ev-code'); if (code) code.textContent = F.toPory(cur()); };

  F.OPS = {
    msg: { label: 'Mensaje', icon: '“ ”', make: () => ({ text: '' }) },
    ask: { label: 'Pregunta sí / no', icon: '?', make: () => ({ text: '¿Quieres ayuda?', then: [], else: [] }) },
    if_flag: { label: 'Si ya pasó algo', icon: '⑂', make: () => ({ flag: 'HABLO_CON_PROFESOR', then: [], else: [] }) },
    set_flag: { label: 'Recordar que pasó', icon: '■', make: () => ({ flag: 'HABLO_CON_PROFESOR' }) },
    clear_flag: { label: 'Olvidar', icon: '□', make: () => ({ flag: 'HABLO_CON_PROFESOR' }) },
    give_item: { label: 'Dar objeto', icon: '+1', make: () => ({ item: 'Poción', qty: 1 }) },
    give_mon: { label: 'Dar Fakemon', icon: '◓', make: () => ({ mon: '', level: 5 }) },
    trainer: { label: 'Combate de entrenador', icon: 'VS', make: () => ({ name: 'Rival', intro: '¡Vamos a luchar!', defeat: '¡No puede ser!', mon: '', level: 5 }) },
    wild: { label: 'Combate salvaje', icon: '~', make: () => ({ mon: '', level: 5 }) },
    heal: { label: 'Curar al equipo', icon: '+PS', make: () => ({}) },
    move: { label: 'Mover personaje', icon: '→', make: () => ({ who: 'player', path: 'arriba, arriba, izquierda' }) },
    warp: { label: 'Teletransportar', icon: '⇲', make: () => ({ map: '', x: 5, y: 5 }) },
    wait: { label: 'Esperar', icon: '…', make: () => ({ frames: 30 }) },
  };

  /* ---------- Poryscript ---------- */
  const str = (t) => '"' + String(t || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n+/g, '\\p') + '"';
  const flagC = (f) => 'FLAG_' + F.constName(f);
  const monC = (ref) => { const m = F.find('fakemons', ref); return 'SPECIES_' + F.constName(m ? m.name : ref || 'NONE'); };
  const mapC = (ref) => { const m = F.find('maps', ref); return 'MAP_' + F.constName(m ? m.name : ref || 'NONE'); };
  const DIRS = { arriba: 'up', abajo: 'down', izquierda: 'left', derecha: 'right', up: 'up', down: 'down', left: 'left', right: 'right' };
  F.parsePath = (path) => String(path || '').split(/[,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean).flatMap((p) => {
    const m = p.match(/^([a-záéíóú]+)\s*(?:[x×*]\s*(\d+))?$/i); if (!m || !DIRS[m[1]]) return [];
    return Array(F.clamp(+(m[2] || 1), 1, 20)).fill(DIRS[m[1]]);
  });
  F.toPory = (script, ctx = { movements: [] }) => {
    if (!script) return '';
    const name = F.camel(script.name), lines = [], movs = [];
    let mi = 0;
    const emit = (steps, ind) => {
      const pad = '    '.repeat(ind);
      for (const s of steps) {
        switch (s.op) {
          case 'msg': lines.push(`${pad}msgbox(format(${str(s.text)}))`); break;
          case 'ask': lines.push(`${pad}msgbox(format(${str(s.text)}), MSGBOX_YESNO)`, `${pad}if (var(VAR_RESULT) == YES) {`); emit(s.then, ind + 1); if (s.else.length) { lines.push(`${pad}} else {`); emit(s.else, ind + 1); } lines.push(`${pad}}`); break;
          case 'if_flag': lines.push(`${pad}if (flag(${flagC(s.flag)})) {`); emit(s.then, ind + 1); if (s.else.length) { lines.push(`${pad}} else {`); emit(s.else, ind + 1); } lines.push(`${pad}}`); break;
          case 'set_flag': lines.push(`${pad}setflag(${flagC(s.flag)})`); break;
          case 'clear_flag': lines.push(`${pad}clearflag(${flagC(s.flag)})`); break;
          case 'give_item': lines.push(`${pad}giveitem(ITEM_${F.itemId(s.item).id}, ${+s.qty || 1})`); break;
          case 'give_mon': lines.push(`${pad}givemon(${monC(s.mon)}, ${+s.level || 5})`, `${pad}msgbox(format(${str('¡Recibiste a ' + ((F.find('fakemons', s.mon) || {}).name || s.mon) + '!')}))`); break;
          case 'trainer': lines.push(`${pad}trainerbattle_single(TRAINER_${F.constName(s.name)}, ${str(s.intro)}, ${str(s.defeat)})`); break;
          case 'wild': lines.push(`${pad}setwildbattle(${monC(s.mon)}, ${+s.level || 5})`, `${pad}dowildbattle`); break;
          case 'heal': lines.push(`${pad}special(HealPlayerParty)`); break;
          case 'move': {
            const label = `${name}_Mov${++mi}`, steps2 = F.parsePath(s.path);
            const grouped = []; for (const d of steps2) { const last = grouped[grouped.length - 1]; if (last && last[0] === d) last[1]++; else grouped.push([d, 1]); }
            movs.push(`movement ${label} {\n${grouped.map(([d, n]) => `    walk_${d}${n > 1 ? ' * ' + n : ''}`).join('\n')}\n}`);
            lines.push(`${pad}applymovement(${s.who === 'player' ? 'OBJ_EVENT_ID_PLAYER' : 'VAR_LAST_TALKED'}, ${label})`, `${pad}waitmovement(0)`); break;
          }
          case 'warp': lines.push(`${pad}warp(${mapC(s.map)}, ${+s.x || 0}, ${+s.y || 0})`); break;
          case 'wait': lines.push(`${pad}delay(${+s.frames || 30})`); break;
          default: break;
        }
      }
    };
    emit(script.steps, 1);
    return `script ${name} {\n    lock\n    faceplayer\n${lines.join('\n')}\n    release\n    end\n}` + (movs.length ? '\n\n' + movs.join('\n\n') : '');
  };
  /** Banderas usadas (para documentarlas en la exportación). */
  F.scriptFlags = (steps, out = new Set()) => { for (const s of steps || []) { if (s.flag) out.add(flagC(s.flag)); F.scriptFlags(s.then, out); F.scriptFlags(s.else, out); } return out; };

  /* ---------- UI por bloques ---------- */
  const monSelect = (s, key) => h('select', { onchange: (e) => { s[key] = e.target.value; save(); } }, h('option', { value: '' }, '— elegir Fakemon —'), ...F.state.project.fakemons.map((m) => h('option', { value: m.id, selected: m.id === s[key] }, m.name)));
  const inp = (s, key, attrs = {}) => h('input', { value: s[key] ?? '', ...attrs, oninput: (e) => { s[key] = attrs.type === 'number' ? +e.target.value : e.target.value; save(); } });
  const lab = (t, el) => h('label', { class: 'field' }, h('span', {}, t), el);

  const blockBody = (s) => {
    switch (s.op) {
      case 'msg': return [h('textarea', { rows: 2, 'aria-label': 'Texto del mensaje', placeholder: 'Lo que dice el personaje… (Enter = nueva página)', oninput: (e) => { s.text = e.target.value; save(); } }, s.text)];
      case 'ask': return [lab('Pregunta', inp(s, 'text')), branch(s, 'then', 'Si responde SÍ'), branch(s, 'else', 'Si responde NO')];
      case 'if_flag': return [lab('¿Ya pasó…? (nombre de la bandera)', inp(s, 'flag')), branch(s, 'then', 'Si ya pasó'), branch(s, 'else', 'Si todavía no')];
      case 'set_flag': case 'clear_flag': return [lab('Bandera', inp(s, 'flag')), h('small', { class: 'muted mono' }, flagC(s.flag))];
      case 'give_item': return [h('div', { class: 'row' }, lab('Objeto', inp(s, 'item', { list: 'dl-items-ev' })), lab('Cantidad', inp(s, 'qty', { type: 'number', min: 1, max: 99, class: 'num' }))), h('datalist', { id: 'dl-items-ev' }, ...Object.keys(F.ITEMS).map((k) => h('option', { value: k })))];
      case 'give_mon': case 'wild': return [h('div', { class: 'row' }, lab('Fakemon', monSelect(s, 'mon')), lab('Nivel', inp(s, 'level', { type: 'number', min: 1, max: 100, class: 'num' })))];
      case 'trainer': return [h('div', { class: 'row' }, lab('Nombre del rival', inp(s, 'name')), lab('Su Fakemon', monSelect(s, 'mon')), lab('Nivel', inp(s, 'level', { type: 'number', min: 1, max: 100, class: 'num' }))), lab('Dice antes', inp(s, 'intro')), lab('Dice al perder', inp(s, 'defeat'))];
      case 'move': return [h('div', { class: 'row' }, lab('Quién', h('select', { onchange: (e) => { s.who = e.target.value; save(); } }, h('option', { value: 'player', selected: s.who === 'player' }, 'El jugador'), h('option', { value: 'self', selected: s.who === 'self' }, 'Este personaje'))),
        lab('Pasos', inp(s, 'path', { placeholder: 'arriba x2, izquierda' }))), h('small', { class: 'muted' }, 'Escribe direcciones separadas por comas. “x3” repite.')];
      case 'warp': return [h('div', { class: 'row' }, lab('Mapa', h('select', { onchange: (e) => { s.map = e.target.value; save(); } }, h('option', { value: '' }, '— elegir —'), ...F.state.project.maps.map((m) => h('option', { value: m.id, selected: m.id === s.map }, m.name)))), lab('x', inp(s, 'x', { type: 'number', class: 'num' })), lab('y', inp(s, 'y', { type: 'number', class: 'num' })))];
      case 'wait': return [lab('Cuadros (60 = 1 segundo)', inp(s, 'frames', { type: 'number', min: 1, max: 600, class: 'num' }))];
      default: return [];
    }
  };
  const addMenu = (list) => {
    const menu = h('div', { class: 'add-menu', hidden: true }, ...Object.entries(F.OPS).map(([op, o]) => h('button', { class: 'btn sm', onclick: () => { list.push({ op, ...o.make() }); save(); render(); } }, o.label)));
    return h('div', { class: 'add-wrap' }, h('button', { class: 'btn sm add', onclick: () => { menu.hidden = !menu.hidden; } }, '+ Agregar paso'), menu);
  };
  const branch = (s, key, title) => h('div', { class: 'branch' }, h('div', { class: 'branch-title' }, title), stepList(s[key]));
  const stepList = (list) => h('div', { class: 'steps' }, ...list.map((s, i) => {
    const o = F.OPS[s.op];
    return h('div', { class: 'block op-' + s.op },
      h('div', { class: 'block-head' }, h('span', { class: 'op-icon', 'aria-hidden': 'true' }, o.icon), h('b', {}, o.label), h('span', { class: 'grow' }),
        h('button', { class: 'btn xs ghost', 'aria-label': 'Subir', disabled: i === 0, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; save(); render(); } }, '↑'),
        h('button', { class: 'btn xs ghost', 'aria-label': 'Bajar', disabled: i === list.length - 1, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; save(); render(); } }, '↓'),
        h('button', { class: 'btn xs ghost', 'aria-label': 'Quitar paso', onclick: () => { list.splice(i, 1); save(); render(); } }, '×')),
      h('div', { class: 'block-body' }, ...blockBody(s)));
  }), addMenu(list));

  const render = () => {
    if (F.state.view !== 'eventos') return;
    const root = $('#view'), p = F.state.project;
    if (!cur()) S.id = p.scripts[0] ? p.scripts[0].id : null;
    const sc = cur();
    const list = h('aside', { class: 'side' },
      h('div', { class: 'side-head' }, h('h2', {}, 'Eventos'), h('span', { class: 'count' }, p.scripts.length)),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: () => { const s = F.newScript('Evento ' + (p.scripts.length + 1)); p.scripts.push(s); S.id = s.id; F.emit('scripts'); render(); } }, '+ Nuevo')),
      h('div', { class: 'asset-list' }, ...p.scripts.map((s) => h('button', { class: 'asset' + (s.id === S.id ? ' sel' : ''), onclick: () => { S.id = s.id; render(); } }, h('span', { class: 'thumb ph' }, '⚙'), h('span', { class: 'asset-text' }, h('b', {}, s.name), h('small', {}, s.steps.length + (s.steps.length === 1 ? ' paso' : ' pasos')))))));
    if (!sc) { root.replaceChildren(h('div', { class: 'split' }, list, h('section', { class: 'empty' }, h('h2', {}, 'Programa lo que pasa en tu juego'), h('p', {}, 'Un evento es una lista de pasos: mensajes, preguntas, combates, regalos… Se arma con bloques, sin escribir código.')))); return; }
    const usedBy = p.maps.flatMap((m) => m.events.filter((e) => e.script === sc.id).map((e) => m.name + ' → ' + e.name));
    const center = h('section', { class: 'sheet' },
      h('header', { class: 'mon-head' }, h('input', { class: 'mon-name', id: 'ev-title', value: sc.name, 'aria-label': 'Nombre del evento', onchange: (e) => { sc.name = e.target.value || sc.name; F.emit('scripts'); render(); } }),
        h('small', { class: 'muted' }, usedBy.length ? 'Se usa en: ' + usedBy.join(', ') : 'Aún no está asignado a ningún personaje o cartel (hazlo en Mapas → Eventos).')),
      stepList(sc.steps));
    const right = h('aside', { class: 'side right wide' },
      h('section', { class: 'panel' }, h('h3', {}, 'Probar'), h('p', { class: 'hint' }, 'Ejecuta el evento con cuadros de diálogo como en el juego.'),
        h('button', { class: 'btn primary', onclick: () => F.play.runStandalone(sc) }, '▶ Probar evento')),
      h('section', { class: 'panel' }, h('h3', {}, 'Código Poryscript'), h('p', { class: 'hint' }, 'Se genera solo. Es lo que se exporta para el proyecto decomp.'),
        h('pre', { class: 'code', id: 'ev-code' }, F.toPory(sc)),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: async () => { try { await navigator.clipboard.writeText(F.toPory(sc)); F.toast('Código copiado'); } catch (e) { const r = document.createRange(); r.selectNodeContents($('#ev-code')); getSelection().removeAllRanges(); getSelection().addRange(r); F.toast('Selecciona y copia con Ctrl+C'); } } }, 'Copiar código'),
          h('button', { class: 'btn sm danger', onclick: async () => { if (!(await F.confirm('Eliminar evento', `Se borrará “${sc.name}”.`, 'Eliminar'))) return; p.scripts = p.scripts.filter((s) => s.id !== sc.id); p.maps.forEach((m) => m.events.forEach((e) => { if (e.script === sc.id) e.script = ''; })); S.id = null; F.emit('scripts'); render(); } }, 'Eliminar evento'))));
    root.replaceChildren(h('div', { class: 'split three' }, list, center, right));
  };
  S.render = render;
  S.open = (id) => { S.id = id; F.go('eventos'); };
})();
