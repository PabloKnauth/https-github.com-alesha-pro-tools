/* Forja GBA — Editor de mapas: capas, colisiones y eventos. */
'use strict';
(() => {
  const F = window.F, { h, $ } = F;
  const S = (F.map = { id: null, layer: 'bottom', tool: 'brush', tile: 1, zoom: 2, selEvent: null, undo: [] });
  const T = 16; // bloque (metatile) de 16×16
  const cur = () => F.find('maps', S.id);
  const tilesetOf = (m) => F.find('sprites', m.tileset);
  const tileCount = (ts) => (ts ? (ts.w / T) * (ts.h / T) : 0);
  F.EVENT_TYPES = {
    npc: { label: 'Personaje (NPC)', color: '#ffb547' },
    sign: { label: 'Cartel', color: '#7cc6ff' },
    item: { label: 'Objeto en el suelo', color: '#ff7aa8' },
    warp: { label: 'Puerta / salida', color: '#9cf28a' },
    trigger: { label: 'Gatillo (al pisar)', color: '#c58cff' },
    start: { label: 'Inicio del jugador', color: '#ffffff' },
  };
  F.BEHAVIORS = { solid: ['Sólido', 'rgba(232,60,70,.9)'], grass: ['Hierba alta (Pokémon salvajes)', 'rgba(70,200,90,.95)'], water: ['Agua', 'rgba(70,140,240,.95)'] };

  /* caché de bloques como canvas para dibujar rápido */
  const tileCache = new Map();
  const tileCanvas = (ts) => {
    const key = ts.palette.join('') + JSON.stringify(ts.extraPalettes || []) + JSON.stringify(ts.blockPal || {}) + ts.h + ':' + hashPx(ts.frames[0]);
    if (tileCache.get(ts.id)?.key === key) return tileCache.get(ts.id).cv;
    const cv = F.frameCanvas(ts, 0); tileCache.set(ts.id, { key, cv }); return cv;
  };
  const hashPx = (px) => { let hsh = px.length; for (let i = 0; i < px.length; i++) hsh = (hsh * 31 + px[i] + 1) | 0; return hsh; };
  F.tileCanvas = tileCanvas;
  F.drawTile = (c, ts, cv, idx, x, y, z) => {
    if (idx < 0 || !ts) return; const cols = ts.w / T, sx = (idx % cols) * T, sy = Math.floor(idx / cols) * T; if (sy >= ts.h) return;
    c.drawImage(cv, sx, sy, T, T, x, y, T * z, T * z);
  };
  F.drawMap = (c, m, z, opts = {}) => {
    const ts = tilesetOf(m), cv = ts && tileCanvas(ts); c.imageSmoothingEnabled = false;
    c.fillStyle = '#20202a'; c.fillRect(0, 0, m.w * T * z, m.h * T * z);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) F.drawTile(c, ts, cv, m.bottom[y * m.w + x], x * T * z, y * T * z, z);
    if (opts.under) opts.under(c);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) F.drawTile(c, ts, cv, m.top[y * m.w + x], x * T * z, y * T * z, z);
  };

  /* ---------- edición ---------- */
  const pushUndo = () => { const m = cur(); S.undo.push({ id: m.id, bottom: m.bottom.slice(), top: m.top.slice(), coll: m.coll.slice(), events: JSON.parse(JSON.stringify(m.events)) }); if (S.undo.length > 60) S.undo.shift(); };
  const undo = () => { const u = S.undo.pop(); if (!u) return; const m = F.find('maps', u.id); Object.assign(m, { bottom: u.bottom, top: u.top, coll: u.coll, events: u.events }); changed(); renderSide(); };
  const layerArr = (m) => (S.layer === 'coll' ? m.coll : S.layer === 'top' ? m.top : m.bottom);
  const paintVal = (erase) => (S.layer === 'coll' ? (erase ? 0 : 1) : erase ? (S.layer === 'top' ? -1 : 0) : S.tile);
  const flood = (arr, m, x, y, v) => { const t = arr[y * m.w + x]; if (t === v) return; const st = [[x, y]]; while (st.length) { const [cx, cy] = st.pop(); if (cx < 0 || cy < 0 || cx >= m.w || cy >= m.h || arr[cy * m.w + cx] !== t) continue; arr[cy * m.w + cx] = v; st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); } };

  let canvas, ctx, drag = null;
  const draw = () => {
    const m = cur(); if (!m || !canvas) return; const z = S.zoom;
    canvas.width = m.w * T * z; canvas.height = m.h * T * z;
    F.drawMap(ctx, m, z);
    if (S.layer !== 'top') { /* atenuar la capa superior mientras se pinta el suelo no es necesario */ }
    if (S.layer === 'coll' || S.showColl) {
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.coll[y * m.w + x]) { ctx.fillStyle = 'rgba(232,60,70,.42)'; ctx.fillRect(x * T * z, y * T * z, T * z, T * z); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(x * T * z + 3, y * T * z + 3); ctx.lineTo((x + 1) * T * z - 3, (y + 1) * T * z - 3); ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath();
    for (let x = 1; x < m.w; x++) { ctx.moveTo(x * T * z + 0.5, 0); ctx.lineTo(x * T * z + 0.5, canvas.height); }
    for (let y = 1; y < m.h; y++) { ctx.moveTo(0, y * T * z + 0.5); ctx.lineTo(canvas.width, y * T * z + 0.5); }
    ctx.stroke();
    for (const ev of m.events) {
      const info = F.EVENT_TYPES[ev.type], px = ev.x * T * z, py = ev.y * T * z, sp = ev.sprite && F.find('sprites', ev.sprite);
      if (sp && ev.type === 'npc') F.drawFrame(ctx, sp, F.WALK.stand[ev.facing || 'down'], px + (T * z - sp.w * z) / 2, py + T * z - sp.h * z, z, ev.facing === 'right');
      ctx.strokeStyle = info.color; ctx.lineWidth = ev.id === S.selEvent ? 3 : 1.5; ctx.strokeRect(px + 1.5, py + 1.5, T * z - 3, T * z - 3); ctx.lineWidth = 1;
      if (!(sp && ev.type === 'npc')) { ctx.fillStyle = info.color; ctx.font = `bold ${8 * z}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText({ npc: '☺', sign: '▤', item: '●', warp: '⇲', start: '★', trigger: '⌖' }[ev.type], px + T * z / 2, py + T * z / 2); }
    }
    const st = curStamp();
    if (st && S.hover && S.layer !== 'events' && S.layer !== 'coll') { ctx.globalAlpha = 0.65; ctx.drawImage(F.stampCanvas(tilesetOf(m), st, z), S.hover[0] * T * z, S.hover[1] * T * z); ctx.globalAlpha = 1; ctx.strokeStyle = '#ffb547'; ctx.lineWidth = 2; ctx.strokeRect(S.hover[0] * T * z, S.hover[1] * T * z, st.w * T * z, st.h * T * z); ctx.lineWidth = 1; }
    if (drag && drag.rect) { const r = drag.rect; ctx.strokeStyle = '#ffb547'; ctx.lineWidth = 2; ctx.strokeRect(Math.min(r[0], r[2]) * T * z, Math.min(r[1], r[3]) * T * z, (Math.abs(r[2] - r[0]) + 1) * T * z, (Math.abs(r[3] - r[1]) + 1) * T * z); ctx.lineWidth = 1; }
  };
  const cell = (e) => { const r = canvas.getBoundingClientRect(), z = S.zoom; return [Math.floor((e.clientX - r.left) / (T * z)), Math.floor((e.clientY - r.top) / (T * z))]; };
  const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
  const onDown = (e) => {
    const m = cur(); if (!m) return; e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    const [x, y] = cell(e); if (!inside(m, x, y)) return; const erase = e.button === 2 || S.tool === 'eraser';
    if (S.layer === 'events') {
      const ev = m.events.find((v) => v.x === x && v.y === y);
      if (ev) { S.selEvent = ev.id; drag = { moveEv: ev }; }
      else if (S.tool === 'brush') { pushUndo(); const nv = newEvent(S.newType, x, y); if (nv.type === 'start') m.events = m.events.filter((v) => v.type !== 'start'); m.events.push(nv); S.selEvent = nv.id; }
      else S.selEvent = null;
      changed(); renderSide(); return;
    }
    const st = curStamp();
    if (st && S.layer !== 'coll' && e.button !== 2) { pushUndo(); F.placeStamp(m, st, x, y); changed(); return; }
    if (S.tool === 'picker') { const v = layerArr(m)[y * m.w + x]; if (S.layer !== 'coll' && v >= 0) { S.tile = v; renderSide(); } return; }
    pushUndo(); const arr = layerArr(m), v = paintVal(erase);
    if (S.tool === 'fill') { flood(arr, m, x, y, v); changed(); return; }
    if (S.tool === 'rect') { drag = { rect: [x, y, x, y], v }; draw(); return; }
    drag = { v }; arr[y * m.w + x] = v; draw();
  };
  const onMove = (e) => {
    const m = cur(); if (!m) return; const [x, y] = cell(e);
    const pos = $('#map-pos'); if (pos) pos.textContent = inside(m, x, y) ? `x ${x} · y ${y}` : '';
    if (curStamp() && (!S.hover || S.hover[0] !== x || S.hover[1] !== y)) { S.hover = [x, y]; draw(); }
    if (!drag || !inside(m, x, y)) return;
    if (drag.moveEv) { if (drag.moveEv.x !== x || drag.moveEv.y !== y) { if (!drag.pushed) { pushUndo(); drag.pushed = true; } drag.moveEv.x = x; drag.moveEv.y = y; draw(); } return; }
    if (drag.rect) { drag.rect[2] = x; drag.rect[3] = y; draw(); return; }
    layerArr(m)[y * m.w + x] = drag.v; draw();
  };
  const onUp = () => {
    const m = cur(); if (!drag || !m) return;
    if (drag.rect) { const [a, b, c, d] = drag.rect, arr = layerArr(m); for (let y = Math.min(b, d); y <= Math.max(b, d); y++) for (let x = Math.min(a, c); x <= Math.max(a, c); x++) arr[y * m.w + x] = drag.v; }
    const wasMove = drag.moveEv; drag = null; changed(); if (wasMove) renderSide();
  };
  const changed = () => { draw(); F.state.dirty = true; F.scheduleAutosave(); };
  const curStamp = () => { const m = cur(), ts = m && tilesetOf(m); return ts && S.stamp ? (ts.stamps || []).find((x) => x.id === S.stamp) : null; };

  const newEvent = (type, x, y) => ({ id: F.uid('ev'), type: type || 'npc', x, y, name: (F.EVENT_TYPES[type || 'npc'].label) + ' ' + (cur().events.length + 1), sprite: '', facing: 'down', movement: 'quieto', script: '', item: 'Poción', toMap: '', toX: 0, toY: 0, hideFlag: '', var: 'PROGRESO', value: 0 });

  const resize = (m, w, hgt) => {
    const remap = (arr, fillV) => { const out = new Array(w * hgt).fill(fillV); for (let y = 0; y < Math.min(hgt, m.h); y++) for (let x = 0; x < Math.min(w, m.w); x++) out[y * w + x] = arr[y * m.w + x]; return out; };
    pushUndo(); m.bottom = remap(m.bottom, 0); m.top = remap(m.top, -1); m.coll = remap(m.coll, 0); m.w = w; m.h = hgt; m.events = m.events.filter((e) => e.x < w && e.y < hgt);
  };
  /* Marca automáticamente como sólidos los bloques que el usuario etiquetó en el tileset. */
  const autoColl = (m) => {
    const ts = tilesetOf(m), solid = new Set(ts?.solid || []); pushUndo();
    const wet = (t) => (ts?.behav || {})[t] === 'water';
    for (let i = 0; i < m.w * m.h; i++) m.coll[i] = solid.has(m.bottom[i]) || wet(m.bottom[i]) || (m.top[i] >= 0 && solid.has(m.top[i])) ? 1 : 0;
    changed(); F.toast('Colisiones calculadas a partir de los bloques marcados como sólidos.');
  };

  /* ---------- panel lateral ---------- */
  const renderSide = () => {
    const m = cur(), box = $('#map-side'); if (!box || !m) return;
    const p = F.state.project, ts = tilesetOf(m);
    const tsSel = h('select', { id: 'map-ts', onchange: (e) => { m.tileset = e.target.value; changed(); renderSide(); } }, h('option', { value: '' }, '— elegir tileset —'), ...p.sprites.filter((s) => s.kind === 'tileset').map((s) => h('option', { value: s.id, selected: s.id === m.tileset }, s.name)));
    let picker = h('p', { class: 'hint' }, 'Elige o crea un tileset (en Pixel → Nuevo → Tileset) para pintar.');
    if (ts) {
      const z = 2, cv = h('canvas', { width: ts.w * z, height: ts.h * z, class: 'ts-picker', 'aria-label': 'Bloques del tileset' }), c = cv.getContext('2d');
      c.imageSmoothingEnabled = false; c.fillStyle = '#2a2836'; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(tileCanvas(ts), 0, 0, ts.w * z, ts.h * z);
      const solid = new Set(ts.solid || []), behav = ts.behav || {};
      for (let i = 0; i < tileCount(ts); i++) {
        const x = (i % (ts.w / T)) * T * z, y = Math.floor(i / (ts.w / T)) * T * z;
        if (solid.has(i)) { c.fillStyle = F.BEHAVIORS.solid[1]; c.fillRect(x + T * z - 9, y + 2, 7, 7); }
        if (behav[i]) { c.fillStyle = F.BEHAVIORS[behav[i]][1]; c.fillRect(x + 2, y + 2, 7, 7); }
      }
      const sx = (S.tile % (ts.w / T)) * T * z, sy = Math.floor(S.tile / (ts.w / T)) * T * z; c.strokeStyle = '#ffb547'; c.lineWidth = 3; c.strokeRect(sx + 1.5, sy + 1.5, T * z - 3, T * z - 3);
      const at = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor(((e.clientX - r.left) / r.width) * (ts.w / T)), Math.floor(((e.clientY - r.top) / r.height) * (ts.h / T))]; };
      let pick = null;
      cv.addEventListener('pointerdown', (e) => { pick = at(e); });
      cv.addEventListener('pointerup', async (e) => {
        const a = pick, b2 = at(e); pick = null; if (!a) return;
        if ((a[0] !== b2[0] || a[1] !== b2[1]) && !e.shiftKey && !S.markMode) {
          const st = F.stampFromBlocks(ts, a[0], a[1], b2[0], b2[1], 'Selección ' + ((ts.stamps || []).length + 1));
          S.stamp = st.id; F.toast(`Estructura de ${st.w}×${st.h} bloques creada. Haz clic en el mapa para colocarla.`); render(); return;
        }
        const i = a[1] * (ts.w / T) + a[0];
        if (e.shiftKey || S.markMode) {
          const mode = S.markMode || 'solid';
          if (mode === 'solid') { const set = new Set(ts.solid || []); set.has(i) ? set.delete(i) : set.add(i); ts.solid = [...set]; }
          else { ts.behav = ts.behav || {}; if (ts.behav[i] === mode) delete ts.behav[i]; else ts.behav[i] = mode; }
          F.scheduleAutosave();
        } else { S.tile = i; S.stamp = null; if (S.layer === 'coll' || S.layer === 'events') S.layer = 'bottom'; }
        render();
      });
      const markSel = h('select', { id: 'map-mark', onchange: (e) => { S.markMode = e.target.value; } }, h('option', { value: '' }, 'Clic elige bloque para pintar'), ...Object.entries(F.BEHAVIORS).map(([k, [l]]) => h('option', { value: k, selected: S.markMode === k }, 'Clic marca: ' + l)));
      picker = h('div', { class: 'stack' }, cv, markSel, h('p', { class: 'hint' }, 'Clic: elegir un bloque. Arrastrar: crear una estructura con varios bloques. Marca qué bloques son sólidos (rojo), hierba alta (verde) o agua (azul) para calcular colisiones y encuentros. Atajo: Mayús + clic marca sólido.'),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => F.pixel.open(ts.id) }, 'Editar tileset'), h('button', { class: 'btn sm', onclick: () => autoColl(m) }, 'Calcular colisiones')));
    }
    const ev = m.events.find((v) => v.id === S.selEvent);
    let evPanel = null;
    if (S.layer === 'events') {
      evPanel = h('section', { class: 'panel' }, h('h3', {}, 'Eventos'),
        h('p', { class: 'hint' }, 'Elige qué colocar y haz clic en el mapa. Arrastra un evento para moverlo.'),
        h('div', { class: 'btn-col' }, ...Object.entries(F.EVENT_TYPES).map(([k, v]) => h('button', { class: 'btn sm' + ((S.newType || 'npc') === k ? ' sel' : ''), style: { '--dot': v.color }, onclick: () => { S.newType = k; S.tool = 'brush'; renderSide(); } }, h('span', { class: 'dot' }), v.label))),
        ev ? eventForm(m, ev) : h('p', { class: 'hint' }, 'Ningún evento seleccionado.'));
    }
    box.replaceChildren(
      h('section', { class: 'panel' }, h('h3', {}, 'Mapa'),
        h('label', { class: 'field' }, h('span', {}, 'Nombre'), h('input', { id: 'map-name', value: m.name, onchange: (e) => { m.name = e.target.value || m.name; F.emit('maps'); render(); } })),
        h('div', { class: 'row' },
          h('label', { class: 'field' }, h('span', {}, 'Ancho'), h('input', { id: 'map-w', type: 'number', min: 8, max: 128, value: m.w, class: 'num', onchange: (e) => { resize(m, F.clamp(+e.target.value, 8, 128), m.h); render(); } })),
          h('label', { class: 'field' }, h('span', {}, 'Alto'), h('input', { id: 'map-h', type: 'number', min: 6, max: 128, value: m.h, class: 'num', onchange: (e) => { resize(m, m.w, F.clamp(+e.target.value, 6, 128)); render(); } }))),
        h('small', { class: 'muted' }, 'La pantalla de la GBA muestra 15×10 bloques.'),
        h('label', { class: 'field' }, h('span', {}, 'Tileset'), tsSel),
        h('label', { class: 'field' }, h('span', {}, 'Evento al entrar al mapa'), h('select', { id: 'map-onenter', onchange: (e) => { m.onEnter = e.target.value; changed(); } }, h('option', { value: '' }, '— ninguno —'), ...p.scripts.map((sc) => h('option', { value: sc.id, selected: sc.id === m.onEnter }, sc.name)))),
        h('div', { class: 'row' },
          h('label', { class: 'field' }, h('span', {}, 'Banco (A-Map)'), h('input', { id: 'map-bank', type: 'number', min: 0, max: 42, value: m.bank, class: 'num', onchange: (e) => { m.bank = +e.target.value; changed(); } })),
          h('label', { class: 'field' }, h('span', {}, 'Mapa (A-Map)'), h('input', { id: 'map-num', type: 'number', min: 0, max: 255, value: m.num, class: 'num', onchange: (e) => { m.num = +e.target.value; changed(); } }))),
        h('small', { class: 'muted' }, 'Banco y número del mapa que reemplazas en tu ROM. Se usan en los teletransportes de XSE.')),
      S.layer === 'events' ? evPanel : structPanel(m, ts),
      S.layer === 'events' ? null : h('section', { class: 'panel' }, h('h3', {}, 'Bloques'), picker),
      wildPanel(m));
  };

  /* Estructuras: casas, árboles y objetos de varios bloques que se colocan con un clic. */
  const structPanel = (m, ts) => {
    const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true, id: 'map-sheet', onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const t = await F.sliceSheetFlow(f, ts ? ts.id : '__new', S.tile); if (t && !m.tileset) m.tileset = t.id; render(); } });
    const list = ts ? (ts.stamps || []) : [];
    return h('section', { class: 'panel' }, h('h3', {}, 'Estructuras'),
      list.length ? h('div', { class: 'stamp-grid' }, ...list.map((st) => h('button', { class: 'stamp' + (st.id === S.stamp ? ' sel' : ''), title: st.name + (st.credit ? ' · créditos: ' + st.credit : ''), onclick: () => { S.stamp = S.stamp === st.id ? null : st.id; if (S.layer === 'coll' || S.layer === 'events') S.layer = 'bottom'; render(); } },
        F.stampCanvas(ts, st, 1), h('span', {}, st.name),
        h('span', { class: 'stamp-x', role: 'button', tabindex: 0, 'aria-label': 'Quitar estructura', onclick: (e) => { e.stopPropagation(); ts.stamps = ts.stamps.filter((x) => x.id !== st.id); if (S.stamp === st.id) S.stamp = null; F.scheduleAutosave(); render(); } }, '×'))))
        : h('p', { class: 'hint' }, 'Todavía no hay estructuras en este tileset.'),
      S.stamp ? h('p', { class: 'hint' }, 'Haz clic en el mapa para colocarla (esquina superior izquierda). Esc o clic de nuevo en ella para soltarla.') : null,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn sm primary', onclick: async () => { const st = await F.structureGenFlow(ts ? ts.id : '__new', S.tile); if (st) { if (!m.tileset) m.tileset = F.state.project.sprites.find((x) => (x.stamps || []).includes(st))?.id || m.tileset; S.stamp = st.id; } render(); } }, '+ Predeterminadas'),
        h('button', { class: 'btn sm', onclick: () => fileIn.click() }, 'Recortar de una imagen'), fileIn));
  };
  /* Pokémon salvajes de la hierba alta del mapa. */
  const wildPanel = (m) => {
    const p = F.state.project, w = m.wild, total = w.list.reduce((a, x) => a + (+x.pct || 0), 0);
    return h('section', { class: 'panel' }, h('h3', {}, 'Pokémon salvajes'),
      h('label', { class: 'field inline' }, h('span', {}, 'Frecuencia en hierba'), h('input', { id: 'wild-rate', type: 'number', min: 1, max: 100, class: 'num', value: w.rate, onchange: (e) => { w.rate = F.clamp(+e.target.value, 1, 100); changed(); } }), h('small', { class: 'muted' }, '/ 100 pasos')),
      ...w.list.map((x, i) => h('div', { class: 'row tight wild-row' },
        h('select', { 'aria-label': 'Fakemon', onchange: (e) => { x.mon = e.target.value; changed(); } }, h('option', { value: '' }, '—'), ...p.fakemons.map((f) => h('option', { value: f.id, selected: f.id === x.mon }, f.name))),
        h('input', { type: 'number', class: 'num', min: 1, max: 100, value: x.min, 'aria-label': 'Nivel mínimo', title: 'Nivel mínimo', onchange: (e) => { x.min = +e.target.value; changed(); } }),
        h('input', { type: 'number', class: 'num', min: 1, max: 100, value: x.max, 'aria-label': 'Nivel máximo', title: 'Nivel máximo', onchange: (e) => { x.max = +e.target.value; changed(); } }),
        h('input', { type: 'number', class: 'num', min: 1, max: 100, value: x.pct, 'aria-label': 'Probabilidad %', title: '% de aparición', onchange: (e) => { x.pct = +e.target.value; renderSide(); changed(); } }),
        h('button', { class: 'btn xs ghost', 'aria-label': 'Quitar', onclick: () => { w.list.splice(i, 1); renderSide(); changed(); } }, '×'))),
      w.list.length ? h('small', { class: total === 100 ? 'muted' : 'warn' }, `Fakemon · nivel mín. · máx. · %   (suma ${total}%${total === 100 ? '' : ', debería ser 100'})`) : h('p', { class: 'hint' }, 'Añade qué Fakemon aparecen al caminar por la hierba alta.'),
      h('button', { class: 'btn sm', disabled: !p.fakemons.length, onclick: () => { w.list.push({ mon: p.fakemons[0].id, min: 2, max: 4, pct: Math.max(0, 100 - total) || 10 }); renderSide(); changed(); } }, '+ Fakemon salvaje'));
  };
  const eventForm = (m, ev) => {
    const p = F.state.project, set = (k) => (e) => { ev[k] = e.target.type === 'number' ? +e.target.value : e.target.value; changed(); };
    const scripts = h('select', { id: 'ev-script', onchange: (e) => { ev.script = e.target.value; changed(); } }, h('option', { value: '' }, '— sin evento —'), ...p.scripts.map((s) => h('option', { value: s.id, selected: s.id === ev.script }, s.name)));
    const rows = [h('label', { class: 'field' }, h('span', {}, 'Nombre'), h('input', { id: 'ev-name', value: ev.name, onchange: set('name') }))];
    if (ev.type === 'npc') {
      rows.push(h('label', { class: 'field' }, h('span', {}, 'Apariencia'), h('select', { id: 'ev-sprite', onchange: (e) => { ev.sprite = e.target.value; changed(); } }, h('option', { value: '' }, '— sin sprite —'), ...p.sprites.filter((s) => s.kind.startsWith('overworld')).map((s) => h('option', { value: s.id, selected: s.id === ev.sprite }, s.name)))));
      rows.push(h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', {}, 'Mira hacia'), h('select', { id: 'ev-facing', onchange: set('facing') }, ...[['down', 'Abajo'], ['up', 'Arriba'], ['left', 'Izquierda'], ['right', 'Derecha']].map(([v, l]) => h('option', { value: v, selected: ev.facing === v }, l)))),
        h('label', { class: 'field' }, h('span', {}, 'Movimiento'), h('select', { id: 'ev-move', onchange: set('movement') }, ...[['quieto', 'Quieto'], ['mirar', 'Mira alrededor'], ['pasear', 'Pasea']].map(([v, l]) => h('option', { value: v, selected: ev.movement === v }, l))))));
    }
    if (ev.type === 'npc') rows.push(h('label', { class: 'field' }, h('span', {}, 'Bandera para ocultarlo (opcional)'), h('input', { id: 'ev-hideflag', value: ev.hideFlag || '', placeholder: 'ej. VECINA_SE_FUE', onchange: (e) => { ev.hideFlag = F.constName(e.target.value).replace(/^SIN_NOMBRE$/, ''); changed(); renderSide(); } })),
      h('small', { class: 'muted' }, 'Mientras esa bandera esté activa, el personaje no aparece (la “People ID” de Advance Map).'));
    if (ev.type === 'trigger') rows.push(h('div', { class: 'row' },
      h('label', { class: 'field' }, h('span', {}, 'Contador'), h('input', { id: 'ev-var', value: ev.var || 'PROGRESO', onchange: (e) => { ev.var = F.constName(e.target.value); changed(); } })),
      h('label', { class: 'field' }, h('span', {}, 'Se activa si vale'), h('input', { id: 'ev-val', type: 'number', min: 0, max: 65535, class: 'num', value: ev.value || 0, onchange: set('value') }))),
      h('small', { class: 'muted' }, 'Para que no se repita, cambia el contador a otro valor dentro del evento (como enseña el tema XI).'));
    if (ev.type === 'item') rows.push(h('label', { class: 'field' }, h('span', {}, 'Objeto'), h('input', { id: 'ev-item', list: 'dl-items', value: ev.item, onchange: set('item') }), h('datalist', { id: 'dl-items' }, ...Object.keys(F.ITEMS).map((k) => h('option', { value: k })))));
    if (ev.type === 'warp') rows.push(h('label', { class: 'field' }, h('span', {}, 'Lleva al mapa'), h('select', { id: 'ev-tomap', onchange: set('toMap') }, h('option', { value: '' }, '— elegir —'), ...p.maps.map((mm) => h('option', { value: mm.id, selected: mm.id === ev.toMap }, mm.name)))),
      h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', {}, 'Llega a x'), h('input', { id: 'ev-tox', type: 'number', class: 'num', value: ev.toX, onchange: set('toX') })), h('label', { class: 'field' }, h('span', {}, 'y'), h('input', { id: 'ev-toy', type: 'number', class: 'num', value: ev.toY, onchange: set('toY') }))));
    if (ev.type === 'npc' || ev.type === 'sign' || ev.type === 'trigger') rows.push(h('label', { class: 'field' }, h('span', {}, ev.type === 'trigger' ? 'Qué pasa al pisarlo' : 'Qué pasa al hablarle'), scripts),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => { const s = F.newScript(ev.name); s.steps.push({ op: 'msg', text: ev.type === 'sign' ? 'Ruta 1 → Pueblo Brisa' : ev.type === 'trigger' ? '¡Espera! No salgas todavía.' : '¡Hola! Bienvenido a mi pueblo.' }); if (ev.type === 'trigger') s.steps.push({ op: 'set_var', var: ev.var || 'PROGRESO', value: (+ev.value || 0) + 1 }); p.scripts.push(s); ev.script = s.id; F.emit('scripts'); F.events.open(s.id); } }, 'Crear evento nuevo'),
        ev.script ? h('button', { class: 'btn sm', onclick: () => F.events.open(ev.script) }, 'Editar evento') : null));
    rows.push(h('p', { class: 'mono small muted' }, `Posición ${ev.x}, ${ev.y}`), h('button', { class: 'btn sm danger', onclick: () => { pushUndo(); m.events = m.events.filter((v) => v.id !== ev.id); S.selEvent = null; changed(); renderSide(); } }, 'Quitar evento'));
    return h('div', { class: 'stack ev-form' }, h('h4', {}, F.EVENT_TYPES[ev.type].label), ...rows);
  };

  const render = () => {
    if (F.state.view !== 'mapas') return;
    const root = $('#view'), p = F.state.project;
    if (!cur()) S.id = p.maps[0] ? p.maps[0].id : null;
    const m = cur();
    const list = h('aside', { class: 'side' },
      h('div', { class: 'side-head' }, h('h2', {}, 'Mapas'), h('span', { class: 'count' }, p.maps.length)),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: () => { const ts = p.sprites.find((s) => s.kind === 'tileset'); const nm = F.newMap('Mapa ' + (p.maps.length + 1), ts && ts.id); p.maps.push(nm); S.id = nm.id; F.emit('maps'); render(); } }, '+ Nuevo')),
      h('div', { class: 'asset-list' }, ...p.maps.map((mm) => h('button', { class: 'asset' + (mm.id === S.id ? ' sel' : ''), onclick: () => { S.id = mm.id; S.selEvent = null; render(); } },
        miniMap(mm), h('span', { class: 'asset-text' }, h('b', {}, mm.name), h('small', {}, `${mm.w}×${mm.h} · ${mm.events.length} eventos`))))));
    if (!m) { root.replaceChildren(h('div', { class: 'split' }, list, h('section', { class: 'empty' }, h('h2', {}, 'Crea un mapa'), h('p', {}, 'Pinta el suelo, pon árboles y casas en la capa de encima, marca por dónde no se puede pasar y coloca personajes, carteles y puertas.')))); return; }
    const LAYERS = [['bottom', 'Suelo', 'Lo que pisa el jugador'], ['top', 'Encima', 'Se dibuja sobre el jugador (copas de árboles, techos)'], ['coll', 'Colisión', 'Rojo = no se puede pasar'], ['events', 'Eventos', 'Personajes, carteles, objetos y puertas']];
    const TOOLS = [['brush', 'Pincel', 'M3 21l3-1 12-12-2-2L4 18z'], ['rect', 'Rectángulo', 'M4 5h16v14H4z'], ['fill', 'Cubeta', 'M5 11l7-7 7 7-7 7z'], ['eraser', 'Borrar', 'M8 20h12M5 15l8-8 6 6-5 5H8z'], ['picker', 'Cuentagotas', 'M14 4l6 6-2 2-6-6zM12 8l-8 8v4h4l8-8']];
    canvas = h('canvas', { id: 'map-canvas', 'aria-label': 'Mapa ' + m.name }); ctx = canvas.getContext('2d');
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp); canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    const center = h('section', { class: 'editor' },
      h('div', { class: 'toolbar' },
        h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Capa' }, ...LAYERS.map(([k, l, tip]) => h('button', { class: S.layer === k ? 'sel' : '', role: 'tab', 'aria-selected': S.layer === k ? 'true' : 'false', title: tip, onclick: () => { S.layer = k; render(); } }, l))),
        h('span', { class: 'sep' }),
        ...TOOLS.map(([k, l, ic]) => h('button', { class: 'tool' + (S.tool === k ? ' sel' : ''), title: l, 'aria-label': l, 'aria-pressed': S.tool === k ? 'true' : 'false', onclick: () => { S.tool = k; render(); } }, F.svgIcon(ic))),
        h('span', { class: 'sep' }),
        h('button', { class: 'tool', title: 'Deshacer (Ctrl+Z)', 'aria-label': 'Deshacer', onclick: undo }, F.svgIcon('M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3')),
        h('button', { class: 'tool', title: 'Alejar', 'aria-label': 'Alejar', onclick: () => { S.zoom = Math.max(1, S.zoom - 1); draw(); } }, F.svgIcon('M5 12h14')),
        h('button', { class: 'tool', title: 'Acercar', 'aria-label': 'Acercar', onclick: () => { S.zoom = Math.min(5, S.zoom + 1); draw(); } }, F.svgIcon('M12 5v14M5 12h14')),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'map-showcoll', checked: !!S.showColl, onchange: (e) => { S.showColl = e.target.checked; draw(); } }), 'Ver colisión'),
        h('span', { class: 'grow' }), h('span', { id: 'map-pos', class: 'mono muted' }),
        h('button', { class: 'btn primary sm', onclick: () => F.play.start(m.id) }, '▶ Probar mapa')),
      h('div', { class: 'canvas-wrap dark' }, canvas),
      h('p', { class: 'hint' }, LAYERS.find((l) => l[0] === S.layer)[2] + '. Clic derecho borra.'));
    root.replaceChildren(h('div', { class: 'split three' }, list, center, h('aside', { class: 'side right', id: 'map-side' })));
    renderSide(); draw();
  };
  const miniMap = (m) => { const cv = h('canvas', { class: 'thumb', width: m.w * 2, height: m.h * 2 }); const c = cv.getContext('2d'); try { const big = document.createElement('canvas'); big.width = m.w * T; big.height = m.h * T; F.drawMap(big.getContext('2d'), m, 1); c.imageSmoothingEnabled = true; c.drawImage(big, 0, 0, cv.width, cv.height); } catch (e) { /* sin tileset */ } return cv; };
  S.render = render;
  S.redraw = draw;
  document.addEventListener('keydown', (e) => { if (F.state.view === 'mapas' && e.key === 'Escape' && S.stamp) { S.stamp = null; render(); } });
  document.addEventListener('keydown', (e) => { if (F.state.view === 'mapas' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); undo(); } });
})();
