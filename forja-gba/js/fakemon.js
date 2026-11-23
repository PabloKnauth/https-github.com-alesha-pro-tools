/* Forja GBA — Laboratorio de Fakemon: datos, estadísticas, movimientos, evolución y sprites. */
'use strict';
(() => {
  const F = window.F, { h, $ } = F;
  const S = (F.fakemon = { id: null });
  const cur = () => F.find('fakemons', S.id);
  const save = () => { F.state.dirty = true; F.scheduleAutosave(); };
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888';

  const field = (label, input, hint) => h('label', { class: 'field' }, h('span', {}, label), input, hint ? h('small', { class: 'muted' }, hint) : null);
  const select = (id, options, value, onchange) => h('select', { id, onchange: (e) => onchange(e.target.value) }, ...options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value) }, l)));
  const datalist = (id, dict) => h('datalist', { id }, ...Object.keys(dict).map((k) => h('option', { value: k })));
  const typeChip = (id) => { const t = F.typeInfo(id); return t ? h('span', { class: 'type-chip', style: { '--t': t[2] } }, t[1]) : null; };

  const drawRadar = (cv, stats) => {
    const c = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) / 2 - 26;
    c.clearRect(0, 0, W, H); c.lineWidth = 1;
    const pt = (i, r) => { const a = -Math.PI / 2 + (i * Math.PI * 2) / 6; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    c.strokeStyle = css('--line');
    for (const f of [0.25, 0.5, 0.75, 1]) { c.beginPath(); for (let i = 0; i <= 6; i++) { const [x, y] = pt(i % 6, R * f); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    c.beginPath(); F.STATS.forEach(([k], i) => { const [x, y] = pt(i, R * Math.min(1, stats[k] / 180)); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath();
    c.fillStyle = css('--accent-soft'); c.fill(); c.strokeStyle = css('--accent'); c.lineWidth = 2; c.stroke();
    c.font = '600 11px ' + css('--font-ui'); c.textAlign = 'center'; c.textBaseline = 'middle';
    F.STATS.forEach(([k, label], i) => { const [x, y] = pt(i, R + 15); c.fillStyle = css('--muted'); c.fillText(label, x, y); });
  };

  /* Escena de combate en miniatura para ver el sprite en contexto. */
  let battleRaf = null;
  const battleScene = (mon) => {
    const cv = h('canvas', { width: 240, height: 160, class: 'battle', 'aria-label': 'Vista de combate' }), c = cv.getContext('2d');
    let tick = 0, last = 0;
    const loop = (t) => {
      if (!document.body.contains(cv)) { battleRaf = null; return; }
      battleRaf = requestAnimationFrame(loop); if (t - last < 250) return; last = t; tick++;
      const g = c.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, '#f8f4e0'); g.addColorStop(0.55, '#e3efd0'); g.addColorStop(1, '#bcd9a4');
      c.fillStyle = g; c.fillRect(0, 0, 240, 160);
      c.fillStyle = '#a8c98c'; c.beginPath(); c.ellipse(176, 74, 50, 12, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9cbf80'; c.beginPath(); c.ellipse(60, 138, 60, 14, 0, 0, Math.PI * 2); c.fill();
      const front = F.find('sprites', mon.sprites.front), back = F.find('sprites', mon.sprites.back);
      if (front) F.drawFrame(c, front, front.frames.length > 1 && tick % 4 === 1 ? 1 : 0, 144, 80 - front.h, 1);
      else { c.fillStyle = '#0003'; c.font = '10px sans-serif'; c.fillText('sin sprite de frente', 140, 40); }
      if (back) F.drawFrame(c, back, 0, 28, 144 - back.h, 1);
      // caja de nombre
      c.fillStyle = '#f8f8f0'; c.strokeStyle = '#4a4a3a'; c.lineWidth = 2; c.fillRect(10, 12, 104, 34); c.strokeRect(10, 12, 104, 34);
      c.fillStyle = '#303030'; c.font = 'bold 10px monospace'; c.fillText(mon.name.toUpperCase().slice(0, 10), 16, 26); c.fillText('Nv5', 88, 26);
      c.fillStyle = '#585858'; c.fillRect(30, 34, 76, 6); c.fillStyle = '#70f8a8'; c.fillRect(31, 35, 74, 4);
      c.fillStyle = '#303030'; c.font = 'bold 7px monospace'; c.fillText('PS', 16, 40);
    };
    battleRaf = requestAnimationFrame(loop);
    return cv;
  };

  const spriteSlot = (mon, slot, kind, label) => {
    const sp = F.find('sprites', mon.sprites[slot]);
    const opts = F.state.project.sprites.filter((s) => s.kind === kind);
    return h('div', { class: 'slot' },
      h('div', { class: 'slot-img' }, sp ? F.thumb(sp, 0, 64) : h('span', { class: 'muted' }, 'vacío')),
      h('div', { class: 'slot-body' }, h('b', {}, label),
        h('select', { id: 'fm-slot-' + slot, onchange: (e) => { mon.sprites[slot] = e.target.value; save(); render(); } },
          h('option', { value: '' }, '— elegir —'), ...opts.map((s) => h('option', { value: s.id, selected: s.id === mon.sprites[slot] }, s.name))),
        h('div', { class: 'btn-row' },
          sp ? h('button', { class: 'btn sm', onclick: () => F.pixel.open(sp.id) }, 'Editar') : null,
          h('button', { class: 'btn sm', onclick: () => {
            const ref = F.find('sprites', mon.sprites.front);
            const s = F.newSprite(kind, mon.name + ' · ' + label.toLowerCase(), { palette: ref ? ref.palette : undefined });
            F.state.project.sprites.push(s); mon.sprites[slot] = s.id; F.emit('sprites'); F.pixel.open(s.id);
          } }, sp ? 'Nuevo' : 'Dibujar')))
    );
  };

  const render = () => {
    if (F.state.view !== 'fakemon') return;
    const root = $('#view'), p = F.state.project;
    if (!cur()) S.id = p.fakemons[0] ? p.fakemons[0].id : null;
    const mon = cur();
    const list = h('aside', { class: 'side' },
      h('div', { class: 'side-head' }, h('h2', {}, 'Fakemon'), h('span', { class: 'count' }, p.fakemons.length)),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: () => { const m = F.newFakemon('Fakemon ' + (p.fakemons.length + 1)); p.fakemons.push(m); S.id = m.id; F.emit('fakemons'); render(); } }, '+ Nuevo')),
      h('div', { class: 'asset-list' }, ...p.fakemons.map((m, i) => { const fr = F.find('sprites', m.sprites.front); return h('button', { class: 'asset' + (m.id === S.id ? ' sel' : ''), onclick: () => { S.id = m.id; render(); } },
        fr ? F.thumb(fr, 0, 40) : h('span', { class: 'thumb ph' }, '?'), h('span', { class: 'asset-text' }, h('b', {}, `#${String(i + 1).padStart(3, '0')} ${m.name}`), h('small', {}, m.types.filter(Boolean).map((t) => F.typeInfo(t)[1]).join(' / ')))); })));
    if (!mon) { root.replaceChildren(h('div', { class: 'split' }, list, h('section', { class: 'empty' }, h('h2', {}, 'Crea tu primer Fakemon'), h('p', {}, 'Define su tipo, estadísticas, movimientos y evolución. Después dibuja sus sprites de frente, espalda e ícono.')))); return; }

    const bst = F.STATS.reduce((a, [k]) => a + (+mon.stats[k] || 0), 0);
    const radar = h('canvas', { width: 260, height: 220, class: 'radar', 'aria-label': 'Gráfico de estadísticas' });
    const bstEl = h('div', { class: 'bst' }, h('span', { class: 'bst-num' }, bst), h('span', {}, h('b', {}, 'Total'), h('small', {}, F.bstClass(bst))));
    const statRows = F.STATS.map(([k, label, color]) => {
      const num = h('input', { type: 'number', min: 1, max: 255, value: mon.stats[k], id: 'fm-st-' + k, class: 'num' });
      const range = h('input', { type: 'range', min: 1, max: 255, value: mon.stats[k], style: { '--c': color }, 'aria-label': label });
      const upd = (v) => { mon.stats[k] = F.clamp(+v || 1, 1, 255); num.value = range.value = mon.stats[k]; const t = F.STATS.reduce((a, [kk]) => a + mon.stats[kk], 0); bstEl.firstChild.textContent = t; bstEl.querySelector('small').textContent = F.bstClass(t); drawRadar(radar, mon.stats); save(); };
      range.addEventListener('input', (e) => upd(e.target.value)); num.addEventListener('change', (e) => upd(e.target.value));
      return h('div', { class: 'stat-row' }, h('span', { class: 'stat-label' }, label), range, num);
    });
    const moveDl = datalist('dl-moves', F.MOVES), abDl = datalist('dl-abilities', F.ABILITIES);
    const abInput = (val, on, id) => { const i = h('input', { id, list: 'dl-abilities', value: val, placeholder: 'Escribe o elige…', onchange: (e) => { on(e.target.value); save(); render(); } }); return i; };
    const warnIf = (res) => (res.known ? null : h('small', { class: 'warn' }, 'No está en la lista: se exportará como ' + res.id + '. Verifica que exista en tu juego.'));

    const learn = h('table', { class: 'learn' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Nivel'), h('th', {}, 'Movimiento'), h('th', {}, 'Constante'), h('th', {}, ''))),
      h('tbody', {}, ...mon.learnset.map((m, i) => { const res = F.moveId(m.move); return h('tr', {},
        h('td', {}, h('input', { type: 'number', min: 1, max: 100, value: m.lvl, class: 'num', 'aria-label': 'Nivel', onchange: (e) => { m.lvl = F.clamp(+e.target.value || 1, 1, 100); save(); } })),
        h('td', {}, h('input', { list: 'dl-moves', value: m.move, 'aria-label': 'Movimiento', onchange: (e) => { m.move = e.target.value; save(); render(); } })),
        h('td', { class: 'mono small' + (res.known ? '' : ' warn') }, res.id ? 'MOVE_' + res.id : ''),
        h('td', {}, h('button', { class: 'btn sm ghost', 'aria-label': 'Quitar movimiento', onclick: () => { mon.learnset.splice(i, 1); save(); render(); } }, '×'))); })));

    const others = p.fakemons.filter((m) => m.id !== mon.id);
    const evoParam = mon.evo.method === 'LEVEL' ? h('input', { type: 'number', min: 2, max: 100, value: mon.evo.param, class: 'num', id: 'fm-evo-lvl', onchange: (e) => { mon.evo.param = +e.target.value; save(); } })
      : mon.evo.method === 'ITEM' ? select('fm-evo-item', F.STONES.map(([v, l]) => [v, l]), mon.evo.param, (v) => { mon.evo.param = v; save(); }) : null;

    const center = h('section', { class: 'sheet' },
      h('header', { class: 'mon-head' },
        h('input', { class: 'mon-name', id: 'fm-name', value: mon.name, maxlength: 12, 'aria-label': 'Nombre del Fakemon', onchange: (e) => { mon.name = e.target.value.trim() || mon.name; F.emit('fakemons'); render(); } }),
        h('div', { class: 'chips' }, ...mon.types.filter(Boolean).map(typeChip)),
        h('small', { class: 'muted mono' }, 'SPECIES_' + F.constName(mon.name) + ' · máx. 12 letras en GBA')),
      h('div', { class: 'cards' },
        h('section', { class: 'card' }, h('h3', {}, 'Identidad'),
          h('div', { class: 'row' }, field('Tipo 1', select('fm-t1', F.TYPES.map((t) => [t[0], t[1]]), mon.types[0], (v) => { mon.types[0] = v; save(); render(); })),
            field('Tipo 2', select('fm-t2', [['', '— ninguno —'], ...F.TYPES.map((t) => [t[0], t[1]])], mon.types[1], (v) => { mon.types[1] = v; save(); render(); }))),
          field('Categoría', h('input', { id: 'fm-cat', value: mon.category, onchange: (e) => { mon.category = e.target.value; save(); } }), 'Ej.: “Pokémon Llama”, aparece en la Pokédex'),
          field('Entrada de la Pokédex', h('textarea', { id: 'fm-dex', rows: 3, maxlength: 180, onchange: (e) => { mon.dex = e.target.value; save(); } }, mon.dex)),
          h('div', { class: 'row' },
            field('Altura (m)', h('input', { type: 'number', step: 0.1, min: 0.1, value: mon.height, class: 'num', id: 'fm-h', onchange: (e) => { mon.height = +e.target.value; save(); } })),
            field('Peso (kg)', h('input', { type: 'number', step: 0.1, min: 0.1, value: mon.weight, class: 'num', id: 'fm-w', onchange: (e) => { mon.weight = +e.target.value; save(); } })),
            field('Color', select('fm-color', F.COLORS.map(([v, l]) => [v, l]), mon.color, (v) => { mon.color = v; save(); })))),
        h('section', { class: 'card' }, h('h3', {}, 'Estadísticas base'), h('div', { class: 'stats' }, h('div', { class: 'stat-rows' }, ...statRows), h('div', { class: 'radar-box' }, radar, bstEl))),
        h('section', { class: 'card' }, h('h3', {}, 'Habilidades'), abDl,
          field('Habilidad 1', abInput(mon.abilities[0], (v) => (mon.abilities[0] = v), 'fm-ab1'), null), warnIf(F.abilityId(mon.abilities[0])),
          field('Habilidad 2 (opcional)', abInput(mon.abilities[1], (v) => (mon.abilities[1] = v), 'fm-ab2')), warnIf(F.abilityId(mon.abilities[1])),
          field('Habilidad oculta (opcional)', abInput(mon.hidden, (v) => (mon.hidden = v), 'fm-abh')), warnIf(F.abilityId(mon.hidden))),
        h('section', { class: 'card' }, h('h3', {}, 'Captura y crianza'),
          h('div', { class: 'row' },
            field('Ratio de captura', h('input', { type: 'number', min: 3, max: 255, value: mon.catchRate, class: 'num', id: 'fm-catch', onchange: (e) => { mon.catchRate = F.clamp(+e.target.value, 3, 255); save(); } }), '3 = legendario · 255 = facilísimo'),
            field('Experiencia base', h('input', { type: 'number', min: 1, max: 400, value: mon.expYield, class: 'num', id: 'fm-exp', onchange: (e) => { mon.expYield = +e.target.value; save(); } }))),
          h('div', { class: 'row' }, field('Crecimiento', select('fm-growth', F.GROWTH.map(([v, l]) => [v, l]), mon.growth, (v) => { mon.growth = v; save(); })),
            field('Género', select('fm-gender', F.GENDERS.map(([v, l]) => [v, l]), mon.genderFemale, (v) => { mon.genderFemale = +v; save(); }))),
          h('div', { class: 'row' }, field('Grupo huevo 1', select('fm-egg1', F.EGG_GROUPS.map(([v, l]) => [v, l]), mon.eggGroups[0], (v) => { mon.eggGroups[0] = v; save(); })),
            field('Grupo huevo 2', select('fm-egg2', [['', '— ninguno —'], ...F.EGG_GROUPS.map(([v, l]) => [v, l])], mon.eggGroups[1], (v) => { mon.eggGroups[1] = v; save(); })))),
        h('section', { class: 'card' }, h('h3', {}, 'Evolución'),
          field('Evoluciona a', select('fm-evo-into', [['', '— no evoluciona —'], ...others.map((m) => [m.id, m.name])], mon.evo.into, (v) => { mon.evo.into = v; save(); render(); })),
          mon.evo.into ? h('div', { class: 'row' }, field('Cómo', select('fm-evo-method', F.EVO_METHODS.map(([v, l]) => [v, l]), mon.evo.method, (v) => { mon.evo.method = v; mon.evo.param = v === 'LEVEL' ? 16 : v === 'ITEM' ? 'FIRE_STONE' : 0; save(); render(); })), evoParam ? field(mon.evo.method === 'LEVEL' ? 'Nivel' : 'Objeto', evoParam) : null) : h('p', { class: 'hint' }, others.length ? 'Elige otra criatura del proyecto como su evolución.' : 'Crea otro Fakemon para poder enlazar su evolución.')),
        h('section', { class: 'card wide' }, h('h3', {}, 'Movimientos por nivel'), moveDl, learn,
          h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => { const lv = mon.learnset.length ? Math.min(100, mon.learnset[mon.learnset.length - 1].lvl + 4) : 1; mon.learnset.push({ lvl: lv, move: '' }); save(); render(); } }, '+ Movimiento'),
            h('button', { class: 'btn sm', onclick: () => { mon.learnset.sort((a, b) => a.lvl - b.lvl); save(); render(); } }, 'Ordenar por nivel')),
          h('p', { class: 'hint' }, 'Escribe el nombre en español (Placaje, Ascuas…) y se convierte a la constante del juego. En GBA caben máximo 4 movimientos aprendidos a la vez.'))));

    const right = h('aside', { class: 'side right' },
      h('section', { class: 'panel' }, h('h3', {}, 'En combate'), battleScene(mon), h('p', { class: 'hint' }, 'Así se ve con los sprites asignados, a escala real ×1.')),
      h('section', { class: 'panel' }, h('h3', {}, 'Sprites'),
        spriteSlot(mon, 'front', 'front', 'Frente'), spriteSlot(mon, 'back', 'back', 'Espalda'), spriteSlot(mon, 'icon', 'icon', 'Ícono')),
      h('section', { class: 'panel' }, h('h3', {}, 'Acciones'), h('div', { class: 'btn-row' },
        h('button', { class: 'btn sm', onclick: () => { const c = JSON.parse(JSON.stringify(mon)); c.id = F.uid('mon'); c.name = (mon.name + '2').slice(0, 12); p.fakemons.push(c); S.id = c.id; F.emit('fakemons'); render(); } }, 'Duplicar'),
        h('button', { class: 'btn sm danger', onclick: async () => { if (!(await F.confirm('Eliminar Fakemon', `Se borrará “${mon.name}”. Sus sprites se conservan.`, 'Eliminar'))) return; p.fakemons = p.fakemons.filter((m) => m.id !== mon.id); S.id = null; F.emit('fakemons'); render(); } }, 'Eliminar'))));
    root.replaceChildren(h('div', { class: 'split three' }, list, center, right));
    drawRadar(radar, mon.stats);
  };
  S.render = render;
})();
