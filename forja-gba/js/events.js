/* Forja GBA — Editor de eventos (mecánicas) por bloques. Los traductores de código están en compilers.js. */
'use strict';
(() => {
  const F = window.F, { h, $ } = F;
  const S = (F.events = { id: null, tab: 'xse' });
  const cur = () => F.find('scripts', S.id);
  const CODE = {
    xse: ['XSE', 'Para ROM binaria de Rojo Fuego: compílalo con XSE y asígnalo en Advance Map.', (s) => F.toXSE(s)],
    pory: ['Poryscript', 'Para el proyecto decomp (pokeemerald-expansion).', (s) => F.toPory(s)],
    ess: ['Essentials', 'Comandos para crear el evento en RPG Maker XP, en el mismo orden.', (s) => F.toEssentials(s)],
  };
  const refreshCode = () => { const code = $('#ev-code'); if (code && cur()) code.textContent = CODE[S.tab][2](cur()); };
  const save = () => { F.state.dirty = true; F.scheduleAutosave(); refreshCode(); };

  F.OPS = {
    msg: { label: 'Mensaje', icon: '“ ”', group: 'Diálogo', make: () => ({ text: '' }) },
    ask: { label: 'Pregunta sí / no', icon: '?', group: 'Diálogo', make: () => ({ text: '¿Quieres ayuda?', then: [], else: [] }) },
    choice: { label: 'Elegir entre opciones', icon: '1·2·3', group: 'Diálogo', make: () => ({ text: '¿Qué Fakemon quieres?', options: [{ label: 'Opción 1', steps: [] }, { label: 'Opción 2', steps: [] }, { label: 'Opción 3', steps: [] }] }) },
    if_flag: { label: 'Si ya pasó algo', icon: '⑂', group: 'Lógica', make: () => ({ flag: 'HABLO_CON_PROFESOR', then: [], else: [] }) },
    set_flag: { label: 'Recordar que pasó', icon: '■', group: 'Lógica', make: () => ({ flag: 'HABLO_CON_PROFESOR' }) },
    clear_flag: { label: 'Olvidar', icon: '□', group: 'Lógica', make: () => ({ flag: 'HABLO_CON_PROFESOR' }) },
    if_var: { label: 'Si un contador…', icon: '#?', group: 'Lógica', make: () => ({ var: 'PROGRESO', cmp: '==', value: 1, then: [], else: [] }) },
    set_var: { label: 'Poner contador en', icon: '#=', group: 'Lógica', make: () => ({ var: 'PROGRESO', value: 1 }) },
    add_var: { label: 'Sumar al contador', icon: '#+', group: 'Lógica', make: () => ({ var: 'PROGRESO', value: 1 }) },
    give_item: { label: 'Dar objeto', icon: '+1', group: 'Regalos y combate', make: () => ({ item: 'Poción', qty: 1 }) },
    give_mon: { label: 'Dar Fakemon', icon: '◓', group: 'Regalos y combate', make: () => ({ mon: '', level: 5 }) },
    trainer: { label: 'Combate de entrenador', icon: 'VS', group: 'Regalos y combate', make: () => ({ name: 'Rival', trainerId: 1, intro: '¡Vamos a luchar!', defeat: '¡No puede ser!', mon: '', level: 5 }) },
    wild: { label: 'Combate salvaje', icon: '~', group: 'Regalos y combate', make: () => ({ mon: '', level: 5 }) },
    heal: { label: 'Curar al equipo', icon: '+PS', group: 'Regalos y combate', make: () => ({}) },
    move: { label: 'Mover personaje', icon: '→', group: 'Personajes y mapa', make: () => ({ who: 'player', path: 'arriba, arriba, izquierda' }) },
    hide_npc: { label: 'Ocultar personaje', icon: '◌', group: 'Personajes y mapa', make: () => ({ target: 'self' }) },
    show_npc: { label: 'Mostrar personaje', icon: '●', group: 'Personajes y mapa', make: () => ({ target: '' }) },
    warp: { label: 'Teletransportar', icon: '⇲', group: 'Personajes y mapa', make: () => ({ map: '', x: 5, y: 5 }) },
    wait: { label: 'Esperar', icon: '…', group: 'Personajes y mapa', make: () => ({ frames: 30 }) },
  };

  /* ---------- campos ---------- */
  const monSelect = (s, key) => h('select', { onchange: (e) => { s[key] = e.target.value; save(); } }, h('option', { value: '' }, '— elegir Fakemon —'), ...F.state.project.fakemons.map((m) => h('option', { value: m.id, selected: m.id === s[key] }, m.name)));
  const inp = (s, key, attrs = {}) => h('input', { value: s[key] ?? '', ...attrs, oninput: (e) => { s[key] = attrs.type === 'number' ? +e.target.value : e.target.value; save(); } });
  const lab = (t, el) => h('label', { class: 'field' }, h('span', {}, t), el);
  const names = (kind) => { const out = new Set(); F.walkSteps(F.state.project.scripts.flatMap((x) => x.steps), (st) => { if (kind === 'flag' && st.flag) out.add(st.flag); if (kind === 'var' && st.var) out.add(st.var); }); F.state.project.maps.forEach((m) => m.events.forEach((e) => { if (kind === 'flag' && e.hideFlag) out.add(e.hideFlag); if (kind === 'var' && e.var) out.add(e.var); })); return [...out]; };
  const nameInput = (s, key, kind) => { const id = 'dl-' + kind + '-' + Math.random().toString(36).slice(2, 7); return [inp(s, key, { list: id, placeholder: kind === 'flag' ? 'NOMBRE_DE_LA_BANDERA' : 'NOMBRE_DEL_CONTADOR' }), h('datalist', { id }, ...names(kind).map((n) => h('option', { value: n })))]; };
  const npcSelect = (s, key, allowSelf) => h('select', { onchange: (e) => { s[key] = e.target.value; save(); } },
    allowSelf ? h('option', { value: 'self', selected: s[key] === 'self' }, 'Este personaje') : h('option', { value: '' }, '— elegir —'),
    ...F.state.project.maps.flatMap((m) => m.events.filter((e) => e.type === 'npc').map((e) => h('option', { value: e.id, selected: e.id === s[key] }, `${m.name} → ${e.name}`))));
  /* Avisos de texto: caracteres que la GBA no tiene y cómo quedará partido en la caja. */
  const textHelp = (getText) => {
    const box = h('div', { class: 'text-help' });
    const upd = () => {
      const t = getText(), bad = F.gbaBadChars(t), xse = F.xseText(t);
      const pages = xse ? xse.split('\\p').length : 0;
      box.replaceChildren(...[
        bad.length ? h('small', { class: 'warn' }, `La GBA no tiene: ${bad.join(' ')} — se quitarán al exportar.`) : null,
        t ? h('small', { class: 'muted' }, `${pages} página${pages === 1 ? '' : 's'} de diálogo en GBA.`) : null].filter(Boolean));
    };
    upd(); return { box, upd };
  };
  const textArea = (s, key, placeholder) => {
    const th = textHelp(() => s[key]);
    const ta = h('textarea', { rows: 2, 'aria-label': 'Texto', placeholder, oninput: (e) => { s[key] = e.target.value; th.upd(); save(); } }, s[key]);
    const ins = (code) => { const a = ta.selectionStart ?? ta.value.length; ta.value = ta.value.slice(0, a) + code + ta.value.slice(ta.selectionEnd ?? a); s[key] = ta.value; th.upd(); save(); ta.focus(); };
    return [ta, h('div', { class: 'row tight' }, h('button', { class: 'btn xs', type: 'button', onclick: () => ins('[player]') }, '+ nombre del jugador'), h('button', { class: 'btn xs', type: 'button', onclick: () => ins('[rival]') }, '+ nombre del rival'), th.box)];
  };

  const blockBody = (s) => {
    switch (s.op) {
      case 'msg': return textArea(s, 'text', 'Lo que dice el personaje… (Enter = página nueva)');
      case 'ask': return [lab('Pregunta', inp(s, 'text')), branch(s, 'then', 'Si responde SÍ'), branch(s, 'else', 'Si responde NO')];
      case 'choice': return [lab('Mensaje antes de elegir (opcional)', inp(s, 'text')),
        ...s.options.map((o, i) => h('div', { class: 'branch' }, h('div', { class: 'row tight' }, lab(`Opción ${i + 1}`, inp(o, 'label')), h('button', { class: 'btn xs ghost', 'aria-label': 'Quitar opción', disabled: s.options.length < 3, onclick: () => { s.options.splice(i, 1); save(); render(); } }, '×')), stepList(o.steps))),
        h('div', { class: 'row tight' }, h('button', { class: 'btn sm', disabled: s.options.length >= 4, onclick: () => { s.options.push({ label: 'Opción ' + (s.options.length + 1), steps: [] }); save(); render(); } }, '+ Opción'),
          h('small', { class: 'muted' }, 'Máximo 4. En GBA se pregunta “¿Opción?” una por una hasta que el jugador acepta.'))];
      case 'if_flag': return [lab('¿Ya pasó…? (nombre de la bandera)', h('div', {}, ...nameInput(s, 'flag', 'flag'))), branch(s, 'then', 'Si ya pasó'), branch(s, 'else', 'Si todavía no')];
      case 'set_flag': case 'clear_flag': return [lab('Bandera', h('div', {}, ...nameInput(s, 'flag', 'flag')))];
      case 'if_var': return [h('div', { class: 'row' }, lab('Contador', h('div', {}, ...nameInput(s, 'var', 'var'))),
        lab('Condición', h('select', { onchange: (e) => { s.cmp = e.target.value; save(); } }, ...F.CMP_LABELS.map(([v, l]) => h('option', { value: v, selected: s.cmp === v }, l)))),
        lab('Valor', inp(s, 'value', { type: 'number', min: 0, max: 65535, class: 'num' }))), branch(s, 'then', 'Si se cumple'), branch(s, 'else', 'Si no')];
      case 'set_var': case 'add_var': return [h('div', { class: 'row' }, lab('Contador', h('div', {}, ...nameInput(s, 'var', 'var'))), lab(s.op === 'set_var' ? 'Valor' : 'Sumar', inp(s, 'value', { type: 'number', min: 0, max: 65535, class: 'num' })))];
      case 'give_item': return [h('div', { class: 'row' }, lab('Objeto', inp(s, 'item', { list: 'dl-items-ev' })), lab('Cantidad', inp(s, 'qty', { type: 'number', min: 1, max: 99, class: 'num' }))), h('datalist', { id: 'dl-items-ev' }, ...Object.keys(F.ITEMS).map((k) => h('option', { value: k })))];
      case 'give_mon': case 'wild': return [h('div', { class: 'row' }, lab('Fakemon', monSelect(s, 'mon')), lab('Nivel', inp(s, 'level', { type: 'number', min: 1, max: 100, class: 'num' })))];
      case 'trainer': return [h('div', { class: 'row' }, lab('Nombre del rival', inp(s, 'name')), lab('Su Fakemon', monSelect(s, 'mon')), lab('Nivel', inp(s, 'level', { type: 'number', min: 1, max: 100, class: 'num' })), lab('Nº entrenador (ROM)', inp(s, 'trainerId', { type: 'number', min: 1, max: 742, class: 'num' }))),
        lab('Dice antes', inp(s, 'intro')), lab('Dice al perder', inp(s, 'defeat'))];
      case 'move': return [h('div', { class: 'row' }, lab('Quién', h('select', { onchange: (e) => { s.who = e.target.value; save(); } }, h('option', { value: 'player', selected: s.who === 'player' }, 'El jugador'), h('option', { value: 'self', selected: s.who === 'self' }, 'Este personaje'))),
        lab('Pasos', inp(s, 'path', { placeholder: 'arriba x2, izquierda' }))), h('small', { class: 'muted' }, 'Direcciones separadas por comas. “x3” repite. Comprueba que el camino esté libre: en el juego el personaje atraviesa lo que encuentre.')];
      case 'hide_npc': return [lab('Personaje', npcSelect(s, 'target', true)), h('small', { class: 'muted' }, 'Para que no vuelva a aparecer, dale una “bandera para ocultarlo” en Mapas → Eventos.')];
      case 'show_npc': return [lab('Personaje', npcSelect(s, 'target', false))];
      case 'warp': return [h('div', { class: 'row' }, lab('Mapa', h('select', { onchange: (e) => { s.map = e.target.value; save(); } }, h('option', { value: '' }, '— elegir —'), ...F.state.project.maps.map((m) => h('option', { value: m.id, selected: m.id === s.map }, m.name)))), lab('x', inp(s, 'x', { type: 'number', class: 'num' })), lab('y', inp(s, 'y', { type: 'number', class: 'num' })))];
      case 'wait': return [lab('Cuadros (60 = 1 segundo)', inp(s, 'frames', { type: 'number', min: 1, max: 600, class: 'num' }))];
      default: return [];
    }
  };
  const addMenu = (list) => {
    const groups = {}; Object.entries(F.OPS).forEach(([op, o]) => (groups[o.group] = groups[o.group] || []).push([op, o]));
    const menu = h('div', { class: 'add-menu', hidden: true }, ...Object.entries(groups).map(([g, ops]) => h('div', { class: 'add-group' }, h('small', {}, g), h('div', { class: 'btn-row' }, ...ops.map(([op, o]) => h('button', { class: 'btn sm', onclick: () => { list.push({ op, ...o.make() }); save(); render(); } }, o.label))))));
    return h('div', { class: 'add-wrap' }, h('button', { class: 'btn sm add', onclick: () => { menu.hidden = !menu.hidden; } }, '+ Agregar paso'), menu);
  };
  const branch = (s, key, title) => h('div', { class: 'branch' }, h('div', { class: 'branch-title' }, title), stepList(s[key]));
  const stepList = (list) => h('div', { class: 'steps' }, ...list.map((s, i) => {
    const o = F.OPS[s.op] || { label: s.op, icon: '?' };
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
      h('div', { class: 'asset-list' }, ...p.scripts.map((s) => h('button', { class: 'asset' + (s.id === S.id ? ' sel' : ''), onclick: () => { S.id = s.id; render(); } }, h('span', { class: 'thumb ph' }, { npc: '☺', sign: '▤', trigger: '⌖', level: '⌂' }[F.scriptUse(s.id).kind]), h('span', { class: 'asset-text' }, h('b', {}, s.name), h('small', {}, s.steps.length + (s.steps.length === 1 ? ' paso' : ' pasos')))))));
    if (!sc) { root.replaceChildren(h('div', { class: 'split' }, list, h('section', { class: 'empty' }, h('h2', {}, 'Programa lo que pasa en tu juego'), h('p', {}, 'Un evento es una lista de pasos: mensajes, preguntas, combates, regalos… Se arma con bloques, sin escribir código.')))); return; }
    const use = F.scriptUse(sc.id);
    const usedBy = p.maps.flatMap((m) => [...m.events.filter((e) => e.script === sc.id).map((e) => m.name + ' → ' + e.name), ...(m.onEnter === sc.id ? [m.name + ' → al entrar al mapa'] : [])]);
    const kindTxt = { npc: 'Se ejecuta al hablar con el personaje.', sign: 'Se ejecuta al leer el cartel.', trigger: 'Gatillo: se ejecuta solo al pisar la casilla.', level: 'De nivel: se ejecuta al entrar al mapa.' }[use.kind];
    const center = h('section', { class: 'sheet' },
      h('header', { class: 'mon-head' }, h('input', { class: 'mon-name', id: 'ev-title', value: sc.name, 'aria-label': 'Nombre del evento', onchange: (e) => { sc.name = e.target.value || sc.name; F.emit('scripts'); render(); } }),
        h('small', { class: 'muted' }, usedBy.length ? `Se usa en: ${usedBy.join(', ')}. ${kindTxt}` : 'Aún no está asignado a nada (hazlo en Mapas → Eventos).')),
      stepList(sc.steps));
    const notes = []; F.toXSE(sc, { notes });
    const right = h('aside', { class: 'side right wide' },
      h('section', { class: 'panel' }, h('h3', {}, 'Probar'), h('p', { class: 'hint' }, 'Ejecuta el evento con cuadros de diálogo como en el juego.'),
        h('button', { class: 'btn primary', onclick: () => F.play.runStandalone(sc) }, '▶ Probar evento')),
      h('section', { class: 'panel' }, h('h3', {}, 'Código generado'),
        h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Formato del código' }, ...Object.entries(CODE).map(([k, [l]]) => h('button', { class: S.tab === k ? 'sel' : '', role: 'tab', 'aria-selected': S.tab === k ? 'true' : 'false', onclick: () => { S.tab = k; render(); } }, l))),
        h('p', { class: 'hint' }, CODE[S.tab][1]),
        S.tab === 'xse' && notes.length ? h('ul', { class: 'issues small' }, ...[...new Set(notes)].map((n) => h('li', {}, n))) : null,
        h('pre', { class: 'code', id: 'ev-code' }, CODE[S.tab][2](sc)),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: async () => { try { await navigator.clipboard.writeText(CODE[S.tab][2](sc)); F.toast('Código copiado'); } catch (e) { const r = document.createRange(); r.selectNodeContents($('#ev-code')); getSelection().removeAllRanges(); getSelection().addRange(r); F.toast('Selecciona y copia con Ctrl+C'); } } }, 'Copiar código'),
          h('button', { class: 'btn sm danger', onclick: async () => { if (!(await F.confirm('Eliminar evento', `Se borrará “${sc.name}”.`, 'Eliminar'))) return; p.scripts = p.scripts.filter((s) => s.id !== sc.id); p.maps.forEach((m) => { m.events.forEach((e) => { if (e.script === sc.id) e.script = ''; }); if (m.onEnter === sc.id) m.onEnter = ''; }); S.id = null; F.emit('scripts'); render(); } }, 'Eliminar evento'))));
    root.replaceChildren(h('div', { class: 'split three' }, list, center, right));
  };
  S.render = render;
  S.open = (id) => { S.id = id; F.go('eventos'); };
})();
