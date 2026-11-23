/* Forja GBA — Estudio de píxeles: dibujo, paleta GBA, cuadros y animación. */
'use strict';
(() => {
  const F = window.F, { h, $ } = F;
  const S = (F.pixel = {
    spriteId: null, frame: 0, tool: 'pencil', color: 1, color2: 0, zoom: 0, grid: true, tiles: true, onion: false, mirror: false,
    undo: [], redo: [], dir: 'down', walking: true, playing: true,
  });
  const TOOLS = [
    { id: 'pencil', label: 'Lápiz', key: 'B', icon: 'M3 21l3-1 12-12-2-2L4 18zM15 5l2-2 4 4-2 2z' },
    { id: 'eraser', label: 'Borrador', key: 'E', icon: 'M8 20h12M5 15l8-8 6 6-5 5H8z' },
    { id: 'fill', label: 'Cubeta', key: 'G', icon: 'M5 11l7-7 7 7-7 7zM19 15c1 2 2 3 2 4a2 2 0 01-4 0c0-1 1-2 2-4z' },
    { id: 'line', label: 'Línea', key: 'L', icon: 'M4 20L20 4' },
    { id: 'rect', label: 'Rectángulo', key: 'R', icon: 'M4 5h16v14H4z' },
    { id: 'ellipse', label: 'Óvalo', key: 'O', icon: 'M12 5c5 0 8 3 8 7s-3 7-8 7-8-3-8-7 3-7 8-7z' },
    { id: 'picker', label: 'Cuentagotas', key: 'I', icon: 'M14 4l6 6-2 2-6-6zM12 8l-8 8v4h4l8-8' },
    { id: 'move', label: 'Mover dibujo', key: 'M', icon: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3' },
  ];
  const svgIcon = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS(s.namespaceURI, 'path'); p.setAttribute('d', d); s.append(p); return s; };
  F.svgIcon = svgIcon;

  const cur = () => F.find('sprites', S.spriteId);
  const px = () => { const s = cur(); return s && s.frames[S.frame]; };

  /* ---------- deshacer ---------- */
  const snapshot = () => { const s = cur(); return { id: s.id, frames: s.frames.map((f) => f.slice()), palette: s.palette.slice(), frame: S.frame }; };
  const pushUndo = () => { if (!cur()) return; S.undo.push(snapshot()); if (S.undo.length > 80) S.undo.shift(); S.redo = []; };
  const restore = (snap) => { const s = F.find('sprites', snap.id); if (!s) return; s.frames = snap.frames; s.palette = snap.palette; S.spriteId = s.id; S.frame = Math.min(snap.frame, s.frames.length - 1); };
  S.doUndo = () => { const u = S.undo.pop(); if (!u) return; S.redo.push(snapshot()); restore(u); changed(true); };
  S.doRedo = () => { const r = S.redo.pop(); if (!r) return; S.undo.push(snapshot()); restore(r); changed(true); };

  /* ---------- operaciones de dibujo ---------- */
  const setPx = (data, s, x, y, v) => {
    if (x < 0 || y < 0 || x >= s.w || y >= s.h) return;
    data[y * s.w + x] = v; if (S.mirror) data[y * s.w + (s.w - 1 - x)] = v;
  };
  const line = (data, s, x0, y0, x1, y1, v) => {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { setPx(data, s, x0, y0, v); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  const rect = (data, s, x0, y0, x1, y1, v) => { line(data, s, x0, y0, x1, y0, v); line(data, s, x1, y0, x1, y1, v); line(data, s, x1, y1, x0, y1, v); line(data, s, x0, y1, x0, y0, v); };
  const ellipse = (data, s, x0, y0, x1, y1, v) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
    if (rx < 0.5 || ry < 0.5) return line(data, s, x0, y0, x1, y1, v);
    const steps = Math.ceil((rx + ry) * 4); let px0 = null;
    for (let i = 0; i <= steps; i++) { const t = (i / steps) * Math.PI * 2, x = Math.round(cx + rx * Math.cos(t)), y = Math.round(cy + ry * Math.sin(t)); if (px0) line(data, s, px0[0], px0[1], x, y, v); px0 = [x, y]; }
  };
  const flood = (data, s, x, y, v) => {
    const target = data[y * s.w + x]; if (target === v) return; const stack = [[x, y]];
    while (stack.length) { const [cx, cy] = stack.pop(); if (cx < 0 || cy < 0 || cx >= s.w || cy >= s.h || data[cy * s.w + cx] !== target) continue; data[cy * s.w + cx] = v; stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); }
  };
  const shift = (data, s, dx, dy) => { const src = data.slice(); data.fill(0); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < s.w && ny < s.h) data[ny * s.w + nx] = src[y * s.w + x]; } };
  const flipH = (data, s) => { const src = data.slice(); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) data[y * s.w + x] = src[y * s.w + s.w - 1 - x]; };
  const flipV = (data, s) => { const src = data.slice(); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) data[y * s.w + x] = src[(s.h - 1 - y) * s.w + x]; };
  const contentBox = (data, s) => { let y0 = s.h, y1 = -1; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (data[y * s.w + x]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return y1 < 0 ? null : { y0, y1 }; };

  /* Ayudantes que dejan un borrador de animación consistente para retocar a mano. */
  S.helpers = {
    walk() {
      const s = cur(); if (!s.kind.startsWith('overworld')) return F.toast('Solo para personajes del mapa.', 'error');
      pushUndo();
      [[0, 3, 4], [1, 5, 6], [2, 7, 8]].forEach(([stand, a, b], dirIdx) => {
        const base = s.frames[stand], bb = contentBox(base, s); if (!bb) return;
        const legTop = bb.y1 - Math.max(2, Math.round((bb.y1 - bb.y0 + 1) * 0.22));
        [a, b].forEach((fi, k) => {
          const f = base.slice();
          // el cuerpo sube 1 px
          for (let y = 0; y < legTop; y++) for (let x = 0; x < s.w; x++) f[y * s.w + x] = base[(y + 1) * s.w + x] ?? 0;
          // las piernas se separan: una mitad avanza 1 px
          const half = Math.floor(s.w / 2), dirSign = dirIdx === 2 ? (k ? -1 : 1) : 0;
          for (let y = legTop; y <= bb.y1; y++) for (let x = 0; x < s.w; x++) {
            const left = x < half, moveIt = dirIdx === 2 ? true : (k === 0 ? left : !left);
            const sx = moveIt ? x - (dirIdx === 2 ? dirSign : 0) : x, sy = moveIt && dirIdx !== 2 ? y + 1 : y;
            f[y * s.w + x] = sx >= 0 && sx < s.w && sy <= bb.y1 ? base[sy * s.w + sx] : 0;
          }
          s.frames[fi] = f;
        });
      });
      changed(true); F.toast('Borrador de caminata creado en los 6 cuadros de paso. Retócalo a tu gusto.');
    },
    breathe() {
      const s = cur(); if (s.frames.length < 2) { pushUndo(); s.frames.push(s.frames[0].slice()); }
      else pushUndo();
      const base = s.frames[0], f = base.slice(), bb = contentBox(base, s); if (!bb) return;
      const seam = bb.y0 + Math.round((bb.y1 - bb.y0) * 0.55);
      for (let y = bb.y0 - 2; y <= seam; y++) for (let x = 0; x < s.w; x++) if (y >= 0) f[y * s.w + x] = base[Math.min(seam, y + 2) * s.w + x];
      s.frames[1] = f; S.frame = 1; changed(true); F.toast('Cuadro 2 creado: el cuerpo se estira 2 px hacia arriba.');
    },
    bounce() { const s = cur(); pushUndo(); if (s.frames.length < 2) s.frames.push(s.frames[0].slice()); s.frames[1] = s.frames[0].slice(); shift(s.frames[1], s, 0, -1); S.frame = 1; changed(true); },
    copyPrev() { const s = cur(); if (S.frame === 0) return; pushUndo(); s.frames[S.frame] = s.frames[S.frame - 1].slice(); changed(true); },
    flipH() { pushUndo(); flipH(px(), cur()); changed(true); },
    flipV() { pushUndo(); flipV(px(), cur()); changed(true); },
    shift(dx, dy) { pushUndo(); shift(px(), cur(), dx, dy); changed(true); },
    clear() { pushUndo(); px().fill(0); changed(true); },
  };

  /* ---------- render del lienzo ---------- */
  let canvas, ctx, overlay = null, preview, prevCtx;
  const autoZoom = (s) => { const wrap = $('#px-canvas-wrap'); const avail = wrap ? Math.min(wrap.clientWidth - 24, wrap.clientHeight - 24) : 512; return F.clamp(Math.floor(Math.max(avail, 256) / Math.max(s.w, s.h)), 2, 24); };
  const zoom = () => S.zoom || autoZoom(cur());
  const checker = (c, x, y, w, hgt, size) => {
    for (let yy = 0; yy < hgt; yy += size) for (let xx = 0; xx < w; xx += size) {
      c.fillStyle = ((xx / size + yy / size) & 1) ? '#cfcbd9' : '#ece9f2'; c.fillRect(x + xx, y + yy, Math.min(size, w - xx), Math.min(size, hgt - yy));
    }
  };
  const draw = () => {
    const s = cur(); if (!s || !canvas) return; const z = zoom();
    canvas.width = s.w * z; canvas.height = s.h * z; ctx.imageSmoothingEnabled = false;
    checker(ctx, 0, 0, canvas.width, canvas.height, Math.max(4, z));
    if (S.onion && S.frame > 0) { ctx.globalAlpha = 0.28; F.drawFrame(ctx, s, S.frame - 1, 0, 0, z); ctx.globalAlpha = 1; }
    const data = overlay || s.frames[S.frame];
    const pal = s.palette;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const v = data[y * s.w + x]; if (!v) continue; ctx.fillStyle = pal[v]; ctx.fillRect(x * z, y * z, z, z); }
    if (S.grid && z >= 6) {
      ctx.strokeStyle = 'rgba(30,25,50,.13)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 1; x < s.w; x++) { ctx.moveTo(x * z + 0.5, 0); ctx.lineTo(x * z + 0.5, canvas.height); }
      for (let y = 1; y < s.h; y++) { ctx.moveTo(0, y * z + 0.5); ctx.lineTo(canvas.width, y * z + 0.5); }
      ctx.stroke();
    }
    if (S.tiles) {
      const step = s.kind === 'tileset' ? 16 : 8;
      ctx.strokeStyle = s.kind === 'tileset' ? 'rgba(255,140,40,.65)' : 'rgba(80,60,200,.35)'; ctx.beginPath();
      for (let x = step; x < s.w; x += step) { ctx.moveTo(x * z + 0.5, 0); ctx.lineTo(x * z + 0.5, canvas.height); }
      for (let y = step; y < s.h; y += step) { ctx.moveTo(0, y * z + 0.5); ctx.lineTo(canvas.width, y * z + 0.5); }
      ctx.stroke();
    }
    if (S.mirror) { ctx.strokeStyle = 'rgba(230,60,90,.7)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke(); ctx.setLineDash([]); }
  };

  /* ---------- puntero ---------- */
  let stroke = null;
  const cell = (e) => { const r = canvas.getBoundingClientRect(), z = zoom(); return [Math.floor((e.clientX - r.left) / z), Math.floor((e.clientY - r.top) / z)]; };
  const onDown = (e) => {
    const s = cur(); if (!s) return; e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    const [x, y] = cell(e), alt = e.button === 2;
    const v = S.tool === 'eraser' ? 0 : alt ? S.color2 : S.color;
    if (S.tool === 'picker') { const got = px()[y * s.w + x]; if (got != null) { if (alt) S.color2 = got; else S.color = got; renderPalette(); } return; }
    pushUndo();
    stroke = { x0: x, y0: y, lx: x, ly: y, v, base: px().slice() };
    if (S.tool === 'fill') { flood(px(), s, x, y, v); stroke = null; changed(); return; }
    if (S.tool === 'pencil' || S.tool === 'eraser') { setPx(px(), s, x, y, v); draw(); }
  };
  const onMove = (e) => {
    const s = cur(); if (!s) return; const [x, y] = cell(e);
    const info = $('#px-pos'); if (info) info.textContent = x >= 0 && y >= 0 && x < s.w && y < s.h ? `x ${x} · y ${y} · bloque ${Math.floor(x / 8)},${Math.floor(y / 8)}` : '';
    if (!stroke) return;
    if (S.tool === 'pencil' || S.tool === 'eraser') { line(px(), s, stroke.lx, stroke.ly, x, y, stroke.v); stroke.lx = x; stroke.ly = y; draw(); }
    else if (S.tool === 'move') { const d = stroke.base.slice(); shift(d, s, x - stroke.x0, y - stroke.y0); s.frames[S.frame] = d; draw(); }
    else { overlay = stroke.base.slice(); ({ line, rect, ellipse })[S.tool](overlay, s, stroke.x0, stroke.y0, x, y, stroke.v); draw(); }
  };
  const onUp = () => {
    if (!stroke) return;
    if (overlay) { cur().frames[S.frame] = overlay; overlay = null; }
    stroke = null; changed();
  };

  /* ---------- actualización ---------- */
  let thumbTimer = null;
  const changed = (full = false) => {
    draw(); F.state.dirty = true; F.scheduleAutosave();
    if (full) return render();
    clearTimeout(thumbTimer); thumbTimer = setTimeout(() => { renderFrames(); renderList(); }, 120);
  };

  /* ---------- paneles ---------- */
  const renderPalette = () => {
    const box = $('#px-palette'); const s = cur(); if (!box || !s) return;
    box.replaceChildren(...s.palette.map((c, i) => h('button', {
      class: 'swatch' + (i === S.color ? ' sel' : '') + (i === S.color2 ? ' sel2' : '') + (i === 0 ? ' transparent' : ''),
      style: { '--c': c }, title: (i === 0 ? 'Transparente (color de fondo ' + c + ')' : 'Color ' + i + ' · ' + c) + ' — clic: principal, clic derecho: secundario',
      'aria-label': i === 0 ? 'Transparente' : 'Color ' + i, onclick: () => { S.color = i; renderPalette(); },
      oncontextmenu: (e) => { e.preventDefault(); S.color2 = i; renderPalette(); },
    }, h('span', {}, i === 0 ? '∅' : i))));
    const inp = $('#px-color-input'), info = $('#px-color-info');
    inp.value = s.palette[S.color];
    info.textContent = S.color === 0 ? 'Índice 0: siempre transparente en el juego.' : `Color ${S.color} · ${s.palette[S.color]} · GBA 0x${F.rgb555(s.palette[S.color]).toString(16).padStart(4, '0').toUpperCase()}`;
    const used = new Set(); s.frames.forEach((f) => f.forEach((v) => used.add(v)));
    $('#px-used').textContent = `${[...used].filter((v) => v).length} de 15 colores en uso`;
  };
  const renderFrames = () => {
    const s = cur(), box = $('#px-frames'); if (!box || !s) return;
    box.replaceChildren(...s.frames.map((_, i) => h('button', { class: 'frame' + (i === S.frame ? ' sel' : ''), onclick: () => { S.frame = i; render(); }, title: F.frameName(s, i) },
      F.thumb(s, i, 56), h('span', {}, F.frameName(s, i)))));
  };
  const renderList = () => {
    const box = $('#px-list'); if (!box) return; const p = F.state.project;
    box.replaceChildren(...p.sprites.map((s) => h('button', { class: 'asset' + (s.id === S.spriteId ? ' sel' : ''), onclick: () => { S.spriteId = s.id; S.frame = 0; S.zoom = 0; render(); } },
      F.thumb(s, 0, 40), h('span', { class: 'asset-text' }, h('b', {}, s.name), h('small', {}, (F.TEMPLATES[s.kind] || {}).label + ' · ' + s.w + '×' + s.h)))));
  };

  /* ---------- vista previa animada ---------- */
  let raf = null, last = 0, tick = 0;
  const animLoop = (t) => {
    raf = requestAnimationFrame(animLoop);
    const s = cur(); if (!s || !preview || !document.body.contains(preview)) return;
    const fps = s.fps || 4; if (t - last < 1000 / fps) return; last = t; if (S.playing) tick++;
    const W = preview.width, H = preview.height, scale = Math.max(1, Math.floor(Math.min(W / s.w, H / s.h) * 0.8));
    prevCtx.fillStyle = s.kind.startsWith('overworld') ? '#8fce7a' : s.kind === 'tileset' ? '#1c1a26' : '#e9f2f6'; prevCtx.fillRect(0, 0, W, H);
    let fi = 0, flip = false;
    if (s.kind.startsWith('overworld') && s.frames.length >= 9) {
      const seq = F.WALK[S.dir]; fi = S.walking ? seq[tick % 4] : F.WALK.stand[S.dir]; flip = S.dir === 'right';
      if (s.kind.startsWith('overworld')) { // sombra
        prevCtx.fillStyle = 'rgba(0,0,0,.18)'; prevCtx.beginPath(); prevCtx.ellipse(W / 2, (H + s.h * scale) / 2 - scale * 1.5, s.w * scale * 0.28, scale * 2.2, 0, 0, Math.PI * 2); prevCtx.fill();
      }
    } else fi = tick % s.frames.length;
    F.drawFrame(prevCtx, s, fi, Math.floor((W - s.w * scale) / 2), Math.floor((H - s.h * scale) / 2), scale, flip);
  };

  /* ---------- diálogo de sprite nuevo ---------- */
  F.newSpriteDialog = async (kindHint) => {
    let kind = kindHint || 'overworld';
    const nameIn = h('input', { id: 'ns-name', value: '' });
    const wIn = h('input', { id: 'ns-w', type: 'number', min: 8, max: 256, step: 8, value: 32 }), hIn = h('input', { id: 'ns-h', type: 'number', min: 8, max: 256, step: 8, value: 32 });
    const freeRow = h('div', { class: 'row', hidden: kind !== 'free' }, h('label', { class: 'field' }, h('span', {}, 'Ancho'), wIn), h('label', { class: 'field' }, h('span', {}, 'Alto'), hIn));
    const cards = h('div', { class: 'tpl-grid' }, ...Object.entries(F.TEMPLATES).map(([k, t]) => h('label', { class: 'tpl' },
      h('input', { type: 'radio', name: 'ns-kind', value: k, checked: k === kind, onchange: () => { kind = k; freeRow.hidden = k !== 'free'; } }),
      h('b', {}, t.label), h('small', {}, `${t.w}×${t.h} px · ${t.frames} cuadro${t.frames > 1 ? 's' : ''}`), h('small', { class: 'muted' }, t.help))));
    const ok = await F.dialog({ title: 'Sprite nuevo', body: h('div', { class: 'stack' }, h('label', { class: 'field' }, h('span', {}, 'Nombre'), nameIn), cards, freeRow), actions: [{ label: 'Cancelar', value: false }, { label: 'Crear', value: true, primary: true }] });
    if (!ok) return null;
    const opts = kind === 'free' ? { w: F.clamp(Math.round(+wIn.value / 8) * 8, 8, 256), h: F.clamp(Math.round(+hIn.value / 8) * 8, 8, 256) } : {};
    const s = F.newSprite(kind, nameIn.value.trim() || F.TEMPLATES[kind].label, opts);
    F.state.project.sprites.push(s); S.spriteId = s.id; S.frame = 0; S.zoom = 0; F.emit('sprites');
    return s;
  };

  /* ---------- vista principal ---------- */
  const render = () => {
    const root = $('#view'); if (F.state.view !== 'pixel') return;
    const p = F.state.project;
    if (!cur()) S.spriteId = p.sprites[0] ? p.sprites[0].id : null;
    const s = cur();
    S.frame = s ? F.clamp(S.frame, 0, s.frames.length - 1) : 0;
    const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true, id: 'px-import', onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) { const sp = await F.importFlow(f); if (sp) { S.spriteId = sp.id; S.frame = 0; S.zoom = 0; render(); } } } });
    const left = h('aside', { class: 'side' },
      h('div', { class: 'side-head' }, h('h2', {}, 'Sprites'), h('span', { class: 'count' }, p.sprites.length)),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: async () => { if (await F.newSpriteDialog()) render(); } }, '+ Nuevo'), h('button', { class: 'btn', onclick: () => fileIn.click() }, 'Importar PNG'), fileIn),
      h('div', { id: 'px-list', class: 'asset-list' }));
    if (!s) {
      root.replaceChildren(h('div', { class: 'split' }, left, h('section', { class: 'empty' }, h('h2', {}, 'Todavía no hay sprites'), h('p', {}, 'Crea uno desde una plantilla con el tamaño correcto para la GBA, o importa un PNG: lo ajusto a 16 colores y a la medida del juego.'))));
      renderList(); return;
    }
    const tpl = F.TEMPLATES[s.kind] || F.TEMPLATES.free;
    const toolbar = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Herramientas' },
      ...TOOLS.map((t) => h('button', { class: 'tool' + (S.tool === t.id ? ' sel' : ''), title: `${t.label} (${t.key})`, 'aria-label': t.label, 'aria-pressed': S.tool === t.id ? 'true' : 'false', onclick: () => { S.tool = t.id; render(); } }, svgIcon(t.icon))),
      h('span', { class: 'sep' }),
      h('button', { class: 'tool' + (S.mirror ? ' sel' : ''), title: 'Simetría: lo que dibujes en un lado aparece en el otro', 'aria-pressed': S.mirror ? 'true' : 'false', onclick: () => { S.mirror = !S.mirror; render(); } }, svgIcon('M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z')),
      h('button', { class: 'tool' + (S.onion ? ' sel' : ''), title: 'Papel cebolla: ver el cuadro anterior en transparencia', 'aria-pressed': S.onion ? 'true' : 'false', onclick: () => { S.onion = !S.onion; draw(); render(); } }, svgIcon('M12 4c4 0 7 3.5 7 8s-3 8-7 8-7-3.5-7-8 3-8 7-8zM12 8c2 0 3.5 1.8 3.5 4S14 16 12 16')),
      h('button', { class: 'tool' + (S.grid ? ' sel' : ''), title: 'Cuadrícula de píxeles', 'aria-pressed': S.grid ? 'true' : 'false', onclick: () => { S.grid = !S.grid; render(); } }, svgIcon('M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16')),
      h('button', { class: 'tool' + (S.tiles ? ' sel' : ''), title: s.kind === 'tileset' ? 'Bordes de bloques de 16×16' : 'Bordes de tiles de 8×8 (como los ve la GBA)', 'aria-pressed': S.tiles ? 'true' : 'false', onclick: () => { S.tiles = !S.tiles; render(); } }, svgIcon('M4 4h16v16H4zM12 4v16M4 12h16')),
      h('span', { class: 'sep' }),
      h('button', { class: 'tool', title: 'Deshacer (Ctrl+Z)', 'aria-label': 'Deshacer', onclick: S.doUndo }, svgIcon('M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3')),
      h('button', { class: 'tool', title: 'Rehacer (Ctrl+Y)', 'aria-label': 'Rehacer', onclick: S.doRedo }, svgIcon('M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3')),
      h('span', { class: 'sep' }),
      h('button', { class: 'tool', title: 'Alejar', 'aria-label': 'Alejar', onclick: () => { S.zoom = F.clamp(zoom() - 2, 1, 40); draw(); } }, svgIcon('M5 12h14')),
      h('button', { class: 'tool', title: 'Acercar', 'aria-label': 'Acercar', onclick: () => { S.zoom = F.clamp(zoom() + 2, 1, 40); draw(); } }, svgIcon('M12 5v14M5 12h14')),
      h('span', { class: 'grow' }), h('span', { id: 'px-pos', class: 'mono muted' }));
    canvas = h('canvas', { id: 'px-canvas', 'aria-label': 'Lienzo de ' + s.name });
    ctx = canvas.getContext('2d');
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp); canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); S.zoom = F.clamp(zoom() + (e.deltaY < 0 ? 1 : -1), 1, 40); draw(); }, { passive: false });
    const frameBar = h('div', { class: 'frames-bar' },
      h('div', { id: 'px-frames', class: 'frames' }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn sm', onclick: () => { pushUndo(); s.frames.splice(S.frame + 1, 0, new Uint8Array(s.w * s.h)); S.frame++; changed(true); } }, '+ Cuadro'),
        h('button', { class: 'btn sm', onclick: () => { pushUndo(); s.frames.splice(S.frame + 1, 0, s.frames[S.frame].slice()); S.frame++; changed(true); } }, 'Duplicar'),
        h('button', { class: 'btn sm', onclick: () => { if (S.frame === 0) return; pushUndo(); const f = s.frames.splice(S.frame, 1)[0]; s.frames.splice(S.frame - 1, 0, f); S.frame--; changed(true); } }, '◀'),
        h('button', { class: 'btn sm', onclick: () => { if (S.frame >= s.frames.length - 1) return; pushUndo(); const f = s.frames.splice(S.frame, 1)[0]; s.frames.splice(S.frame + 1, 0, f); S.frame++; changed(true); } }, '▶'),
        h('button', { class: 'btn sm danger', disabled: s.frames.length < 2, onclick: () => { pushUndo(); s.frames.splice(S.frame, 1); S.frame = Math.max(0, S.frame - 1); changed(true); } }, 'Quitar')));
    const center = h('section', { class: 'editor' }, toolbar,
      h('div', { id: 'px-canvas-wrap', class: 'canvas-wrap' }, canvas),
      h('div', { class: 'frame-title' }, h('b', {}, F.frameName(s, S.frame)), h('span', { class: 'muted' }, ` · cuadro ${S.frame + 1} de ${s.frames.length} · ${s.w}×${s.h} px`)),
      frameBar);

    const colorIn = h('input', { type: 'color', id: 'px-color-input', oninput: (e) => { const sn = F.snapHex(e.target.value); if (S.color === 0 && false) return; s.palette[S.color] = sn; draw(); renderPalette(); }, onchange: () => { changed(true); } });
    colorIn.addEventListener('focus', pushUndo, { once: false });
    const otherPal = h('select', { id: 'px-pal-copy', onchange: (e) => { const o = F.find('sprites', e.target.value); e.target.value = ''; if (!o) return; pushUndo(); s.palette = o.palette.slice(); changed(true); F.toast('Paleta copiada de ' + o.name); } },
      h('option', { value: '' }, 'Usar la paleta de…'), ...p.sprites.filter((o) => o.id !== s.id).map((o) => h('option', { value: o.id }, o.name)));
    preview = h('canvas', { id: 'px-preview', width: 220, height: 170, 'aria-label': 'Vista previa animada' }); prevCtx = preview.getContext('2d');
    const isOW = s.kind.startsWith('overworld');
    const right = h('aside', { class: 'side right' },
      h('section', { class: 'panel' }, h('h3', {}, 'Paleta GBA'), h('p', { class: 'hint' }, 'Máximo 16 colores. El primero es el transparente.'),
        h('div', { id: 'px-palette', class: 'palette' }),
        h('div', { class: 'row' }, colorIn, h('span', { id: 'px-color-info', class: 'mono small' })),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn sm', disabled: S.color === 0, title: 'Crea 4 tonos (sombra → luz) a partir del color elegido, con el giro de tono que usan los artistas de pixel art', onclick: () => { pushUndo(); const r = F.ramp(s.palette[S.color], 4); r.forEach((c, k) => { if (S.color + k < 16) s.palette[S.color + k] = c; }); changed(true); } }, 'Rampa de sombras'),
          h('button', { class: 'btn sm', onclick: () => { [S.color, S.color2] = [S.color2, S.color]; renderPalette(); } }, 'Intercambiar (X)')),
        otherPal, h('small', { id: 'px-used', class: 'muted' })),
      h('section', { class: 'panel' }, h('h3', {}, 'Vista previa'), preview,
        isOW ? h('div', { class: 'btn-row dirs' }, ...[['left', '←'], ['up', '↑'], ['down', '↓'], ['right', '→']].map(([d, l]) => h('button', { class: 'btn sm' + (S.dir === d ? ' sel' : ''), 'aria-label': 'Mirar ' + d, onclick: () => { S.dir = d; render(); } }, l)),
          h('button', { class: 'btn sm' + (S.walking ? ' sel' : ''), onclick: () => { S.walking = !S.walking; render(); } }, S.walking ? 'Caminando' : 'Quieto')) : null,
        h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: () => { S.playing = !S.playing; render(); } }, S.playing ? 'Pausa' : 'Reproducir'),
          h('label', { class: 'field inline' }, h('span', {}, 'Velocidad'), h('select', { id: 'px-fps', onchange: (e) => { s.fps = +e.target.value; F.scheduleAutosave(); } },
            ...[[2, 'Lenta'], [4, 'Normal'], [7.5, 'Juego (7.5 fps)'], [12, 'Rápida']].map(([v, l]) => h('option', { value: v, selected: +s.fps === v }, l)))))),
      h('section', { class: 'panel' }, h('h3', {}, 'Ayudantes de animación'), h('p', { class: 'hint' }, tpl.help),
        h('div', { class: 'btn-col' },
          isOW ? h('button', { class: 'btn', onclick: S.helpers.walk }, 'Generar caminata desde los 3 quietos') : null,
          s.kind === 'front' ? h('button', { class: 'btn', onclick: S.helpers.breathe }, 'Generar cuadro de entrada (estiramiento)') : null,
          s.kind === 'icon' ? h('button', { class: 'btn', onclick: S.helpers.bounce }, 'Generar salto del ícono') : null,
          h('button', { class: 'btn', disabled: S.frame === 0, onclick: S.helpers.copyPrev }, 'Copiar el cuadro anterior aquí'),
          h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: S.helpers.flipH }, 'Voltear ↔'), h('button', { class: 'btn sm', onclick: S.helpers.flipV }, 'Voltear ↕'), h('button', { class: 'btn sm danger', onclick: S.helpers.clear }, 'Borrar cuadro')),
          h('div', { class: 'btn-row' }, ...[['←', -1, 0], ['↑', 0, -1], ['↓', 0, 1], ['→', 1, 0]].map(([l, dx, dy]) => h('button', { class: 'btn sm', title: 'Mover 1 px', onclick: () => S.helpers.shift(dx, dy) }, l))))),
      h('section', { class: 'panel' }, h('h3', {}, 'Propiedades'),
        h('label', { class: 'field' }, h('span', {}, 'Nombre'), h('input', { id: 'px-name', value: s.name, onchange: (e) => { s.name = e.target.value || s.name; F.emit('sprites'); renderList(); } })),
        h('p', { class: 'hint' }, tpl.label + ' · ' + s.w + '×' + s.h + ' px'),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn sm', onclick: () => { const c = { ...s, id: F.uid('spr'), name: s.name + ' (copia)', palette: s.palette.slice(), frames: s.frames.map((f) => f.slice()) }; p.sprites.push(c); S.spriteId = c.id; F.emit('sprites'); render(); } }, 'Duplicar sprite'),
          h('button', { class: 'btn sm', onclick: () => { const sh = F.sheet(s, s.frames.map((_, i) => i), 'h'); F.download(F.fileName(s.name) + '.png', F.encodePNG(sh.px, sh.w, sh.h, s.palette)); } }, 'Descargar PNG'),
          h('button', { class: 'btn sm danger', onclick: async () => { if (!(await F.confirm('Eliminar sprite', `Se borrará “${s.name}”. Puedes deshacerlo solo si guardaste el proyecto antes.`, 'Eliminar'))) return; p.sprites = p.sprites.filter((o) => o.id !== s.id); S.spriteId = null; F.emit('sprites'); render(); } }, 'Eliminar'))));
    root.replaceChildren(h('div', { class: 'split three' }, left, center, right));
    renderList(); renderFrames(); renderPalette();
    requestAnimationFrame(draw);
    if (!raf) raf = requestAnimationFrame(animLoop);
  };
  S.render = render;
  S.open = (id, frame = 0) => { S.spriteId = id; S.frame = frame; S.zoom = 0; F.go('pixel'); };

  document.addEventListener('keydown', (e) => {
    if (F.state.view !== 'pixel' || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || document.querySelector('.modal-back')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? S.doRedo() : S.doUndo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); S.doRedo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = TOOLS.find((x) => x.key.toLowerCase() === k); if (t) { S.tool = t.id; render(); return; }
    if (k === 'x') { [S.color, S.color2] = [S.color2, S.color]; renderPalette(); return; }
    if (/^[0-9]$/.test(k)) { S.color = k === '0' ? 10 : +k; renderPalette(); return; }
    const s = cur(); if (!s) return;
    if (k === '[' || k === ',') { S.frame = (S.frame - 1 + s.frames.length) % s.frames.length; render(); }
    if (k === ']' || k === '.') { S.frame = (S.frame + 1) % s.frames.length; render(); }
    if (S.tool === 'move' && k.startsWith('arrow')) { e.preventDefault(); S.helpers.shift(k === 'arrowleft' ? -1 : k === 'arrowright' ? 1 : 0, k === 'arrowup' ? -1 : k === 'arrowdown' ? 1 : 0); }
  });
  window.addEventListener('resize', () => { if (F.state.view === 'pixel' && !S.zoom) draw(); });
})();
