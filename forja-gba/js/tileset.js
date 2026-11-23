/* Forja GBA — tilesets con varias paletas, estructuras (sellos de varios bloques),
   recortador de hojas de recursos y generadores de personajes y edificios. */
'use strict';
(() => {
  const F = window.F, { h } = F;
  const T = 16, MAX_PALETTES = 12, MAX_H = 512;
  F.MAX_PALETTES = MAX_PALETTES;

  /* ---------- paletas por bloque ---------- */
  F.palCount = (s) => 1 + (s.extraPalettes ? s.extraPalettes.length : 0);
  F.palAt = (s, i) => (i > 0 && s.extraPalettes && s.extraPalettes[i - 1]) || s.palette;
  F.blockPalIndex = (s, block) => (s.blockPal && s.blockPal[block]) || 0;
  /** Paleta para el píxel (x, y) de un sprite: en tilesets depende del bloque. */
  F.palForPixel = (s, x, y) => (s.kind === 'tileset' && s.blockPal ? F.palAt(s, F.blockPalIndex(s, Math.floor(y / T) * (s.w / T) + Math.floor(x / T))) : s.palette);

  const blockCount = (ts) => (ts.w / T) * (ts.h / T);
  const blockPixels = (ts, b) => { const out = new Uint8Array(T * T), cols = ts.w / T, bx = (b % cols) * T, by = Math.floor(b / cols) * T, f = ts.frames[0]; for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) out[y * T + x] = f[(by + y) * ts.w + bx + x]; return out; };
  const writeBlock = (ts, b, px) => { const cols = ts.w / T, bx = (b % cols) * T, by = Math.floor(b / cols) * T, f = ts.frames[0]; for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) f[(by + y) * ts.w + bx + x] = px[y * T + x]; };
  const growTileset = (ts) => { if (ts.h >= MAX_H) return false; const nh = ts.h + T, nf = new Uint8Array(ts.w * nh); nf.set(ts.frames[0]); ts.frames[0] = nf; ts.h = nh; return true; };
  const usedBlocks = (ts) => {
    const used = new Set([0]);
    ((F.state.project && F.state.project.maps) || []).filter((m) => m.tileset === ts.id).forEach((m) => { m.bottom.forEach((v) => used.add(v)); m.top.forEach((v) => v >= 0 && used.add(v)); });
    (ts.stamps || []).forEach((st) => st.cells.forEach((c) => { if (c.b >= 0) used.add(c.b); if (c.t >= 0) used.add(c.t); }));
    return used;
  };
  const freeBlocks = (ts) => { const used = usedBlocks(ts), out = []; for (let b = 0; b < blockCount(ts); b++) if (!used.has(b) && blockPixels(ts, b).every((v) => v === 0)) out.push(b); return out; };

  /* RGBA de un bloque del tileset (para pintar debajo de una estructura). */
  const blockRGBA = (ts, b) => { const px = blockPixels(ts, b), pal = F.palAt(ts, F.blockPalIndex(ts, b)).map(F.hexToRgb), out = new Uint8ClampedArray(T * T * 4); px.forEach((v, i) => { if (!v) return; out.set([...pal[v], 255], i * 4); }); return out; };
  const dist = (a, b) => (a[0] - b[0]) ** 2 * 3 + (a[1] - b[1]) ** 2 * 4 + (a[2] - b[2]) ** 2 * 2;

  /**
   * Agrega una imagen (ImageData) al tileset como estructura.
   * opts: name, topRows (filas que pasan por encima del jugador), ground (bloque que va debajo o null),
   *       solid: 'all' | 'bottom' | 'none', door: {x, y} en bloques, credit.
   */
  F.addStructure = (ts, img, opts = {}) => {
    const warn = [];
    // 1) ajustar a múltiplos de 16: centrado a lo ancho, apoyado abajo
    const W = Math.ceil(img.width / T) * T, H = Math.ceil(img.height / T) * T, ox = Math.floor((W - img.width) / 2), oy = H - img.height;
    const cw = W / T, ch = H / T, topRows = Math.min(opts.topRows || 0, ch - 1);
    const ground = opts.ground != null && opts.ground >= 0 ? blockRGBA(ts, opts.ground) : null;
    const rgba = new Uint8ClampedArray(W * H * 4), src = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = x - ox, sy = y - oy, o = (y * W + x) * 4, cellRow = Math.floor(y / T);
      let px = null;
      if (sx >= 0 && sy >= 0 && sx < img.width && sy < img.height && img.data[(sy * img.width + sx) * 4 + 3] >= 128) { const s = (sy * img.width + sx) * 4; px = [img.data[s], img.data[s + 1], img.data[s + 2]]; src.set([px[0], px[1], px[2], 255], o); }
      if (!px && ground && cellRow >= topRows) { const g = ((y % T) * T + (x % T)) * 4; if (ground[g + 3]) px = [ground[g], ground[g + 1], ground[g + 2]]; }
      if (px) { rgba[o] = px[0]; rgba[o + 1] = px[1]; rgba[o + 2] = px[2]; rgba[o + 3] = 255; }
    }
    // 2) ¿cabe? (antes de tocar el tileset)
    let need = 0; for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) { let any = false; for (let y = 0; y < T && !any; y++) for (let x = 0; x < T; x++) if (rgba[((cy * T + y) * W + cx * T + x) * 4 + 3]) { any = true; break; } if (any) need++; }
    const room = freeBlocks(ts).length + ((MAX_H - ts.h) / T) * (ts.w / T);
    if (need > room) { warn.push(`“${opts.name || 'Estructura'}” necesita ${need} bloques y el tileset solo tiene ${room} libres. Elige “Tileset nuevo” o una escala menor.`); return { stamp: null, warn }; }
    if (cw > 8) warn.push(`“${opts.name || 'Estructura'}” mide ${cw} bloques de ancho: es muy grande para la pantalla de la GBA (15 bloques).`);
    // 3) reducir a 15 colores y elegir paleta
    const q = F.quantize(new ImageData(rgba, W, H), 15);
    if (q.lost) warn.push(`Tenía ${q.lost + 15} colores; se redujo a 15.`);
    const used = new Set(q.px); used.delete(0);
    const qcols = [...used].map((i) => F.hexToRgb(q.palette[i]));
    // índices que ya usan los bloques de cada paleta (los demás son huecos libres)
    const usedIdx = (p) => { const u = new Set([0]); for (let b = 0; b < blockCount(ts); b++) if (F.blockPalIndex(ts, b) === p) blockPixels(ts, b).forEach((v) => u.add(v)); return u; };
    const CLOSE = 260;
    let palIdx = -1, best = Infinity, bestMap = null, remap = null;
    for (let p = 0; p < F.palCount(ts); p++) {
      const pal = F.palAt(ts, p).map(F.hexToRgb), uu = usedIdx(p); let worst = 0, missing = []; const map = {};
      [...used].forEach((i, k) => { let bi = 1, bd = Infinity; for (let j = 1; j < 16; j++) { if (!uu.has(j) && F.palAt(ts, p)[j] === '#000000') continue; const d = dist(qcols[k], pal[j]); if (d < bd) { bd = d; bi = j; } } map[i] = bi; worst = Math.max(worst, bd); if (bd > CLOSE) missing.push(i); });
      // ¿caben los colores que faltan en los huecos libres de esta paleta?
      const free = [...Array(15).keys()].map((j) => j + 1).filter((j) => !uu.has(j) && F.palAt(ts, p)[j] === '#000000' && !Object.values(map).some((v, n) => v === j && !missing.includes(+Object.keys(map)[n])));
      if (missing.length <= free.length) {
        const score = missing.length * 1e6 + worst;
        if (score < best) { best = score; palIdx = p; bestMap = { map, missing, free }; }
      } else if (worst < best && best >= 1e9) { /* sin espacio */ }
      if (!bestMap && worst < best) { best = 1e9 + worst; palIdx = p; bestMap = { map, missing: [], free: [], nearestOnly: true }; }
    }
    if (bestMap && !bestMap.nearestOnly) {
      const P = F.palAt(ts, palIdx); bestMap.missing.forEach((i, n) => { const j = bestMap.free[n]; P[j] = q.palette[i]; bestMap.map[i] = j; });
      remap = bestMap.map;
    } else if (F.palCount(ts) < MAX_PALETTES) { ts.extraPalettes = ts.extraPalettes || []; ts.extraPalettes.push(q.palette.slice()); palIdx = ts.extraPalettes.length; remap = null; }
    else { remap = bestMap.map; warn.push(`El tileset ya usa ${MAX_PALETTES} paletas: los colores se adaptaron a la más parecida.`); }
    // 3) colocar cada bloque (reutilizando los idénticos)
    const cells = [], free = freeBlocks(ts), cols = ts.w / T;
    const findSame = (px) => { for (let b = 1; b < blockCount(ts); b++) { if (F.blockPalIndex(ts, b) !== palIdx) continue; const o = blockPixels(ts, b); let same = true; for (let i = 0; i < o.length; i++) if (o[i] !== px[i]) { same = false; break; } if (same && o.some((v) => v)) return b; } return -1; };
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      const px = new Uint8Array(T * T);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const v = q.px[(cy * T + y) * W + cx * T + x]; px[y * T + x] = v ? (remap ? remap[v] : v) : 0; }
      const empty = px.every((v) => v === 0), isTop = cy < topRows;
      const solid = opts.solid === 'all' ? 1 : opts.solid === 'bottom' ? (isTop ? 0 : 1) : 0;
      const isDoor = opts.door && opts.door.x === cx && opts.door.y === cy;
      if (empty) { cells.push({ b: -1, t: -1, c: isTop ? 0 : solid }); continue; }
      let b = findSame(px);
      if (b < 0) {
        while (!free.length) { if (!growTileset(ts)) break; for (let k = blockCount(ts) - cols; k < blockCount(ts); k++) free.push(k); }
        if (!free.length) { warn.push('El tileset está lleno (256 bloques). Crea otro tileset para más estructuras.'); return { stamp: null, warn }; }
        b = free.shift(); writeBlock(ts, b, px);
        if (palIdx) { ts.blockPal = ts.blockPal || {}; ts.blockPal[b] = palIdx; } else if (ts.blockPal) delete ts.blockPal[b];
      }
      cells.push(isTop ? { b: -1, t: b, c: 0 } : { b, t: -1, c: isDoor ? 0 : solid });
    }
    const stamp = { id: F.uid('est'), name: opts.name || 'Estructura', w: cw, h: ch, cells, credit: opts.credit || '', door: opts.door || null };
    if (opts.name !== '_bloque' && src.some((v, i) => i % 4 === 3 && v === 0)) { let b64 = ''; for (let i = 0; i < src.length; i += 8192) b64 += String.fromCharCode.apply(null, src.subarray(i, i + 8192)); stamp.src = btoa(b64); stamp.topRows = topRows; }
    ts.stamps = ts.stamps || []; ts.stamps.push(stamp);
    F.state.dirty = true; F.scheduleAutosave();
    return { stamp, warn };
  };
  /** Estructura a partir de un rectángulo de bloques ya existentes del tileset. */
  F.stampFromBlocks = (ts, x0, y0, x1, y1, name) => {
    const cols = ts.w / T, cells = [];
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const b = y * cols + x; cells.push({ b, t: -1, c: (ts.solid || []).includes(b) ? 1 : 0 }); }
    const st = { id: F.uid('est'), name: name || 'Selección', w: Math.abs(x1 - x0) + 1, h: Math.abs(y1 - y0) + 1, cells, credit: '' };
    ts.stamps = ts.stamps || []; ts.stamps.push(st); F.scheduleAutosave(); return st;
  };
  /** Dibuja una estructura (vista previa). */
  F.stampCanvas = (ts, st, z = 1) => {
    const cv = document.createElement('canvas'); cv.width = st.w * T * z; cv.height = st.h * T * z; cv.className = 'stamp-thumb';
    const c = cv.getContext('2d'), tc = F.tileCanvas(ts); c.imageSmoothingEnabled = false;
    st.cells.forEach((cell, i) => { const x = (i % st.w) * T * z, y = Math.floor(i / st.w) * T * z; if (cell.b >= 0) F.drawTile(c, ts, tc, cell.b, x, y, z); if (cell.t >= 0) F.drawTile(c, ts, tc, cell.t, x, y, z); });
    return cv;
  };
  /** Coloca una estructura en el mapa; devuelve true si cambió algo. */
  /* RGBA de una celda de la imagen original (con transparencia) de una estructura. */
  const srcCell = (st, i) => {
    if (!st.src) return null; if (!st._src) { const bin = atob(st.src), arr = new Uint8ClampedArray(bin.length); for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k); Object.defineProperty(st, '_src', { value: arr, enumerable: false, writable: true }); }
    const W = st.w * T, cx = (i % st.w) * T, cy = Math.floor(i / st.w) * T, out = new Uint8ClampedArray(T * T * 4);
    for (let y = 0; y < T; y++) out.set(st._src.subarray(((cy + y) * W + cx) * 4, ((cy + y) * W + cx + T) * 4), y * T * 4);
    return out;
  };
  /* Funde la celda de la estructura sobre el suelo que ya hay en el mapa (camino, arena, agua…). */
  const blendOnGround = (ts, st, i, groundB) => {
    ts.blend = ts.blend || {}; const key = `${st.id}:${i}:${groundB}`;
    if (ts.blend[key] != null) return ts.blend[key];
    const top = srcCell(st, i); if (!top) return null;
    if (top.every((v, n) => n % 4 !== 3 || v === 255)) return null;               // la celda es opaca: no hace falta
    const base = blockRGBA(ts, groundB);
    for (let p = 0; p < T * T; p++) if (top[p * 4 + 3]) base.set(top.subarray(p * 4, p * 4 + 4), p * 4); else base[p * 4 + 3] = base[p * 4 + 3] || 0;
    if (!base.some((v, n) => n % 4 === 3 && v)) return null;
    const r = F.addStructure(ts, new ImageData(base, T, T), { name: '_bloque', solid: 'none' });
    if (!r.stamp) return null;
    ts.stamps = ts.stamps.filter((x) => x !== r.stamp);
    return (ts.blend[key] = r.stamp.cells[0].b);
  };
  F.placeStamp = (m, st, x0, y0, tsArg) => {
    const ts = tsArg || (F.state.project && F.find('sprites', m.tileset));
    st.cells.forEach((cell, i) => {
      const x = x0 + (i % st.w), y = y0 + Math.floor(i / st.w); if (x < 0 || y < 0 || x >= m.w || y >= m.h) return; const k = y * m.w + x;
      let b = cell.b;
      const plain = ts && ts.terrain && Object.entries(ts.terrain).some(([key, v]) => key.startsWith('0000') && v === m.bottom[k]);
      if (b >= 0 && ts && st.src && m.bottom[k] !== b && !plain) { const nb = blendOnGround(ts, st, i, m.bottom[k]); if (nb != null) b = nb; }
      if (b >= 0) m.bottom[k] = b; if (cell.t >= 0) m.top[k] = cell.t; else if (cell.b >= 0) m.top[k] = -1;
      if (cell.b >= 0 || cell.t >= 0) m.coll[k] = cell.c;
    });
    if (st.door) {
      const dx = x0 + st.door.x, dy = y0 + st.door.y;
      if (dx < m.w && dy < m.h && !m.events.some((e) => e.x === dx && e.y === dy)) m.events.push({ id: F.uid('ev'), type: 'warp', x: dx, y: dy, name: 'Puerta de ' + st.name, sprite: '', facing: 'down', movement: 'quieto', script: '', item: '', toMap: '', toX: 0, toY: 0, hideFlag: '', var: '', value: 0 });
    }
  };

  /* ---------- detección de fondo y recorte de objetos de una hoja ---------- */
  const near = (d, o, c, tol) => Math.abs(d[o] - c[0]) <= tol && Math.abs(d[o + 1] - c[1]) <= tol && Math.abs(d[o + 2] - c[2]) <= tol;
  /** Colores del borde de la imagen (fondo liso, cuadriculado o con textura). */
  F.borderColors = (img, max = 6) => {
    const counts = new Map(), { width: w, height: hgt, data } = img, add = (x, y) => { const o = (y * w + x) * 4; if (data[o + 3] < 128) return; const k = (data[o] >> 3) << 10 | (data[o + 1] >> 3) << 5 | (data[o + 2] >> 3); counts.set(k, (counts.get(k) || 0) + 1); };
    for (let x = 0; x < w; x++) { add(x, 0); add(x, hgt - 1); } for (let y = 0; y < hgt; y++) { add(0, y); add(w - 1, y); }
    const total = 2 * (w + hgt);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n > total * 0.03).slice(0, max).map(([k]) => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4]);
  };
  /** Quita el fondo: inunda desde el borde por los colores de fondo (con tolerancia). */
  F.removeBackground = (img, bgColors, tol = 14, everywhere = false) => {
    const { width: w, height: hgt } = img, d = new Uint8ClampedArray(img.data), isBg = (o) => d[o + 3] < 128 || bgColors.some((c) => near(d, o, c, tol));
    if (everywhere) { for (let o = 0; o < d.length; o += 4) if (isBg(o)) d[o + 3] = 0; return new ImageData(d, w, hgt); }
    const seen = new Uint8Array(w * hgt), stack = [];
    for (let x = 0; x < w; x++) stack.push(x, (hgt - 1) * w + x); for (let y = 0; y < hgt; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) { const i = stack.pop(); if (seen[i]) continue; seen[i] = 1; const o = i * 4; if (!isBg(o)) continue; d[o + 3] = 0; const x = i % w, y = (i / w) | 0; if (x > 0) stack.push(i - 1); if (x < w - 1) stack.push(i + 1); if (y > 0) stack.push(i - w); if (y < hgt - 1) stack.push(i + w); }
    return new ImageData(d, w, hgt);
  };
  /** Objetos separados (componentes conectados), fusionando los que están a menos de `gap` píxeles. */
  F.findObjects = (img, gap = 2, minSize = 6) => {
    const { width: w, height: hgt, data } = img, lab = new Int32Array(w * hgt).fill(-1), boxes = [];
    for (let i = 0; i < w * hgt; i++) {
      if (lab[i] >= 0 || data[i * 4 + 3] < 128) continue;
      const id = boxes.length, b = { x0: w, y0: hgt, x1: 0, y1: 0, n: 0 }, st = [i]; lab[i] = id;
      while (st.length) { const j = st.pop(), x = j % w, y = (j / w) | 0; b.n++; if (x < b.x0) b.x0 = x; if (y < b.y0) b.y0 = y; if (x > b.x1) b.x1 = x; if (y > b.y1) b.y1 = y;
        for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < hgt - 1 ? j + w : -1]) if (k >= 0 && lab[k] < 0 && data[k * 4 + 3] >= 128) { lab[k] = id; st.push(k); } }
      boxes.push(b);
    }
    let merged = true, list = boxes.filter((b) => b.n >= 2);
    while (merged) {
      merged = false;
      outer: for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
        const A = list[a], B = list[b];
        const near = A.x0 - gap <= B.x1 && B.x0 - gap <= A.x1 && A.y0 - gap <= B.y1 && B.y0 - gap <= A.y1;
        const overlap = A.x0 < B.x1 && B.x0 < A.x1 && A.y0 < B.y1 && B.y0 < A.y1;
        const small = (X) => Math.min(X.x1 - X.x0, X.y1 - X.y0) < minSize * 2 || X.n < 40;
        if ((near && (small(A) || small(B))) || overlap) { list[a] = { x0: Math.min(A.x0, B.x0), y0: Math.min(A.y0, B.y0), x1: Math.max(A.x1, B.x1), y1: Math.max(A.y1, B.y1), n: A.n + B.n }; list.splice(b, 1); merged = true; break outer; }
      }
    }
    return list.filter((b) => b.x1 - b.x0 + 1 >= minSize && b.y1 - b.y0 + 1 >= minSize).sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  };
  /** Escala estimada aunque no sea entera (imágenes ampliadas ×3.4, etc.): promedio de las rachas de “1 píxel”. */
  F.estimateScale = (img) => {
    const { width: w, height: hgt, data } = img, runs = new Map();
    const key = (o) => (data[o + 3] < 128 ? -1 : (data[o] << 16) | (data[o + 1] << 8) | data[o + 2]);
    const scan = (len, at) => { let prev = null, n = 0; for (let i = 0; i <= len; i++) { const k = i < len ? key(at(i)) : null; if (k === prev) n++; else { if (prev != null && prev !== -1) runs.set(n, (runs.get(n) || 0) + 1); prev = k; n = 1; } } };
    for (let y = 0; y < hgt; y += 2) scan(w, (x) => (y * w + x) * 4);
    for (let x = 0; x < w; x += 2) scan(hgt, (y) => (y * w + x) * 4);
    const total = [...runs.values()].reduce((a, b) => a + b, 0); if (!total) return 1;
    const lens = [...runs.keys()].sort((a, b) => a - b), m = lens.find((l) => runs.get(l) >= total * 0.04) || 1;
    let n = 0, sum = 0; for (const l of [m, m + 1]) { const c = runs.get(l) || 0; n += c; sum += c * l; }
    const est = n ? sum / n : 1;
    return est < 1.4 ? 1 : Math.round(est * 10) / 10;
  };
  const cropImg = (img, b, scale) => {
    const w = b.x1 - b.x0 + 1, hgt = b.y1 - b.y0 + 1, W = Math.max(1, Math.round(w / scale)), H = Math.max(1, Math.round(hgt / scale)), out = new ImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sx = b.x0 + Math.min(w - 1, Math.floor((x + 0.5) * scale)), sy = b.y0 + Math.min(hgt - 1, Math.floor((y + 0.5) * scale)), s = (sy * img.width + sx) * 4, d = (y * W + x) * 4; for (let k = 0; k < 4; k++) out.data[d + k] = img.data[s + k]; }
    return out;
  };

  /** Pide (o crea) el tileset destino. */
  const tilesetChooser = (current) => {
    const p = F.state.project, sets = p.sprites.filter((s) => s.kind === 'tileset');
    const full = (s) => Math.round((1 - (freeBlocks(s).length + ((MAX_H - s.h) / T) * (s.w / T)) / ((MAX_H / T) * (s.w / T))) * 100);
    return h('select', { id: 'st-target' }, ...sets.map((s) => h('option', { value: s.id, selected: s.id === current }, `${s.name} (${full(s)}% usado · ${F.palCount(s)}/${MAX_PALETTES} paletas)`)), h('option', { value: '__new', selected: current === '__new' }, '+ Tileset nuevo'));
  };
  const resolveTileset = (val) => { if (val !== '__new') return F.find('sprites', val); const ts = F.newSprite('tileset', 'Tileset de estructuras'); ts.h = 16; ts.frames = [new Uint8Array(ts.w * 16)]; F.state.project.sprites.push(ts); return ts; };
  const groundChooser = (ts, ground) => h('label', { class: 'field' }, h('span', {}, 'Suelo debajo'),
    h('select', { id: 'st-ground' }, h('option', { value: '-1' }, 'Transparente (para la capa Encima)'), ...(ts ? [...Array(Math.min(blockCount(ts), 64)).keys()].filter((b) => blockPixels(ts, b).some((v) => v)).map((b) => h('option', { value: b, selected: b === ground }, 'Bloque ' + b)) : [])));

  /* ---------- diálogo: recortar estructuras de una hoja de recursos ---------- */
  F.sliceSheetFlow = async (file, tsId, ground = 0) => {
    let img; try { img = await F.readImageFile(file); } catch (e) { F.toast(e.message, 'error'); return; }
    const det = F.detectScale(img);
    let bg = F.borderColors(img), tol = /jpe?g|webp/i.test(file.type + file.name) ? 28 : 10, scale = 0, everywhere = false, clean = null, objs = [], sel = new Set(), manual = [];
    const objScale = (b) => { if (scale) return scale; if (b.k) return b.k; const crop = cropImg(clean, b, 1); b.k = F.detectScale(crop).k; if (b.k === 1) b.k = F.estimateScale(crop); return b.k; };
    const sizeOf = (b) => { const k = objScale(b); return [Math.ceil((b.x1 - b.x0 + 1) / k / T), Math.ceil((b.y1 - b.y0 + 1) / k / T), k]; };
    const view = h('canvas', { class: 'slice-view', 'aria-label': 'Hoja con los objetos detectados' }), info = h('p', { class: 'hint' });
    const chips = h('div', { class: 'row tight' });
    const redraw = () => {
      const maxW = 620, z = Math.min(1, maxW / img.width); view.width = Math.round(img.width * z); view.height = Math.round(img.height * z);
      const c = view.getContext('2d'); c.imageSmoothingEnabled = false;
      const tmp = document.createElement('canvas'); tmp.width = img.width; tmp.height = img.height; tmp.getContext('2d').putImageData(clean, 0, 0);
      c.fillStyle = '#d8d4e4'; c.fillRect(0, 0, view.width, view.height); c.drawImage(tmp, 0, 0, view.width, view.height);
      objs.forEach((b, i) => { c.strokeStyle = sel.has(i) ? '#ffb547' : 'rgba(80,60,200,.7)'; c.lineWidth = sel.has(i) ? 3 : 1; c.strokeRect(b.x0 * z - 1, b.y0 * z - 1, (b.x1 - b.x0 + 1) * z + 2, (b.y1 - b.y0 + 1) * z + 2); });
      if (dragBox) { c.strokeStyle = '#e8442a'; c.setLineDash([4, 3]); c.strokeRect(Math.min(dragBox[0], dragBox[2]) * z, Math.min(dragBox[1], dragBox[3]) * z, Math.abs(dragBox[2] - dragBox[0]) * z, Math.abs(dragBox[3] - dragBox[1]) * z); c.setLineDash([]); }
      view.dataset.z = z;
      const sizes = [...sel].map((i) => { const [bw, bh, k] = sizeOf(objs[i]); return `${bw}×${bh} bloques${k > 1 ? ` (×${k})` : ''}${bw > 8 ? ' ⚠ muy grande' : ''}`; });
      info.textContent = `${objs.length} objetos detectados · ${sel.size} elegidos${sizes.length ? ': ' + sizes.join(', ') : ''}. Clic: elegir. Arrastrar: marcar un recorte a mano (útil si las piezas están pegadas).`;
    };
    const recompute = () => {
      manual.forEach((b) => delete b.k); clean = F.removeBackground(img, bg, tol, everywhere); objs = [...manual, ...F.findObjects(clean, Math.max(2, det.k * 2), Math.max(6, det.k * 6))]; sel = new Set([...sel].filter((i) => i < objs.length));
      chips.replaceChildren(h('small', { class: 'muted' }, 'Fondo:'), ...bg.map((c, i) => h('button', { class: 'swatch mini', style: { '--c': F.rgbToHex(...c) }, title: 'Quitar este color de fondo', onclick: () => { bg.splice(i, 1); recompute(); } })), h('small', { class: 'muted' }, 'Clic derecho en la imagen = agregar color de fondo'));
      redraw();
    };
    let dragBox = null, downAt = null;
    const imgXY = (e) => { const r = view.getBoundingClientRect(), z = +view.dataset.z; return [F.clamp(Math.round((e.clientX - r.left) / (r.width / view.width) / z), 0, img.width - 1), F.clamp(Math.round((e.clientY - r.top) / (r.height / view.height) / z), 0, img.height - 1)]; };
    view.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; downAt = imgXY(e); view.setPointerCapture(e.pointerId); });
    view.addEventListener('pointermove', (e) => { if (!downAt) return; const [x, y] = imgXY(e); if (Math.abs(x - downAt[0]) + Math.abs(y - downAt[1]) > 6) { dragBox = [downAt[0], downAt[1], x, y]; redraw(); } });
    view.addEventListener('pointerup', (e) => {
      if (!downAt) return; const [x, y] = imgXY(e), start = downAt; downAt = null;
      if (dragBox) { const b = { x0: Math.min(dragBox[0], dragBox[2]), y0: Math.min(dragBox[1], dragBox[3]), x1: Math.max(dragBox[0], dragBox[2]), y1: Math.max(dragBox[1], dragBox[3]), n: 1 }; dragBox = null; manual.push(b); const keep = [...sel].map((i) => i + 1); recompute(); sel = new Set([0, ...keep]); redraw(); return; }
      const i = objs.findIndex((b) => start[0] >= b.x0 - 2 && start[0] <= b.x1 + 2 && start[1] >= b.y0 - 2 && start[1] <= b.y1 + 2); if (i >= 0) { sel.has(i) ? sel.delete(i) : sel.add(i); redraw(); }
    });
    view.addEventListener('contextmenu', (e) => { e.preventDefault(); const r = view.getBoundingClientRect(), z = +view.dataset.z, x = Math.floor((e.clientX - r.left) / (r.width / view.width) / z), y = Math.floor((e.clientY - r.top) / (r.height / view.height) / z), o = (y * img.width + x) * 4; bg.push([img.data[o], img.data[o + 1], img.data[o + 2]]); recompute(); });
    const scaleSel = h('select', { id: 'sl-scale', onchange: (e) => { scale = +e.target.value; redraw(); } }, h('option', { value: 0, selected: true }, 'Automática (detecta cada objeto)'), ...[1, 2, 3, 4, 5, 6, 8, 10].map((k) => h('option', { value: k }, k === 1 ? 'Tamaño real (×1)' : `Ampliada ×${k} → reducir`)));
    const tolIn = h('input', { id: 'sl-tol', type: 'range', min: 0, max: 60, value: tol, oninput: (e) => { tol = +e.target.value; recompute(); } });
    const everyIn = h('input', { type: 'checkbox', id: 'sl-every', onchange: (e) => { everywhere = e.target.checked; recompute(); } });
    const tsSel = tilesetChooser(tsId), nameIn = h('input', { id: 'sl-name', value: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') });
    const kind = h('select', { id: 'sl-kind' }, h('option', { value: 'building' }, 'Edificio (todo sólido, puerta abajo al centro)'), h('option', { value: 'tree' }, 'Árbol / farol (la fila de arriba pasa sobre el jugador)'), h('option', { value: 'deco' }, 'Decoración que se pisa'), h('option', { value: 'solid' }, 'Objeto sólido'));
    const credit = h('input', { id: 'sl-credit', placeholder: 'ej. Rata, Bacon, Zeo' });
    const tsNow = F.find('sprites', tsId);
    const body = h('div', { class: 'stack' },
      h('p', { class: 'muted' }, `Imagen de ${img.width}×${img.height} px. ${det.k > 1 ? `Parece ampliada ×${det.k}.` : ''} Detecté el fondo por los colores del borde; los objetos aparecen enmarcados.`),
      view, info, chips,
      h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', {}, 'Escala'), scaleSel), h('label', { class: 'field' }, h('span', {}, 'Tolerancia del fondo'), tolIn), h('label', { class: 'check' }, everyIn, 'Quitar el color de fondo también dentro de los objetos')),
      h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', {}, 'Nombre'), nameIn), h('label', { class: 'field' }, h('span', {}, 'Tipo'), kind)),
      h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', {}, 'Agregar al tileset'), tsSel), groundChooser(tsNow, ground)),
      h('label', { class: 'field' }, h('span', {}, 'Créditos del autor'), credit, h('small', { class: 'muted' }, 'Muchas hojas piden dar créditos. Se guardan y se exportan en CREDITOS.txt.')));
    recompute();
    const ok = await F.dialog({ title: 'Recortar estructuras de una hoja', body, actions: [{ label: 'Cancelar', value: false }, { label: 'Agregar elegidas', value: true, primary: true }] });
    if (!ok) return;
    if (!sel.size) { F.toast('No elegiste ningún objeto.', 'error'); return; }
    const ts = resolveTileset(tsSel.value), g = +F.$('#st-ground', body)?.value, k = kind.value, warns = new Set(); let n = 0;
    [...sel].sort((a, b) => a - b).forEach((i, j) => {
      const part = cropImg(clean, objs[i], objScale(objs[i])), wBlocks = Math.ceil(part.width / T);
      const { stamp, warn } = F.addStructure(ts, part, { name: nameIn.value + (sel.size > 1 ? ' ' + (j + 1) : ''), topRows: k === 'tree' ? 1 : 0, ground: g >= 0 ? g : null, solid: k === 'building' || k === 'solid' ? 'all' : k === 'tree' ? 'bottom' : 'none', door: k === 'building' ? { x: Math.floor(wBlocks / 2), y: Math.ceil(part.height / T) - 1 } : null, credit: credit.value.trim() });
      warn.forEach((w) => warns.add(w)); if (stamp) n++;
    });
    F.emit('sprites');
    F.toast(`${n} estructura${n === 1 ? '' : 's'} agregada${n === 1 ? '' : 's'} a ${ts.name}.` + (warns.size ? ' ' + [...warns].join(' ') : ''));
    return ts;
  };

  /* ---------- diálogo: estructuras predeterminadas (edificios y objetos) ---------- */
  F.structureGenFlow = async (tsId, ground = 0) => {
    const A = F.art; let o = { ...A.BUILD_PRESETS[0] }, mode = 'building', objKey = 'pino';
    const prev = h('canvas', { class: 'gen-preview', 'aria-label': 'Vista previa' });
    const form = h('div', { class: 'stack' });
    const draw = () => {
      const r = mode === 'building' ? A.building(o) : A.OBJECTS[objKey].make(), z = Math.max(1, Math.min(4, Math.floor(240 / Math.max(r.img.width, r.img.height))));
      prev.width = r.img.width * z; prev.height = r.img.height * z; const c = prev.getContext('2d'); c.imageSmoothingEnabled = false;
      const tmp = document.createElement('canvas'); tmp.width = r.img.width; tmp.height = r.img.height; tmp.getContext('2d').putImageData(r.img, 0, 0);
      c.fillStyle = '#8fce7a'; c.fillRect(0, 0, prev.width, prev.height); c.drawImage(tmp, 0, 0, prev.width, prev.height);
    };
    const sel = (label, key, opts) => h('label', { class: 'field' }, h('span', {}, label), h('select', { onchange: (e) => { o[key] = e.target.value; draw(); } }, ...opts.map(([v, l]) => h('option', { value: v, selected: String(o[key] || '') === String(v) }, l))));
    const color = (label, key) => h('label', { class: 'field' }, h('span', {}, label), h('input', { type: 'color', value: F.snapHex(o[key] || '#888888'), oninput: (e) => { o[key] = e.target.value; draw(); } }));
    const renderForm = () => {
      form.replaceChildren(
        h('div', { class: 'seg' }, h('button', { class: mode === 'building' ? 'sel' : '', onclick: () => { mode = 'building'; renderForm(); } }, 'Edificios'), h('button', { class: mode === 'obj' ? 'sel' : '', onclick: () => { mode = 'obj'; renderForm(); } }, 'Árboles y objetos')),
        mode === 'building' ? h('div', { class: 'stack' },
          h('div', { class: 'chip-row' }, ...A.BUILD_PRESETS.map((pr) => h('button', { class: 'btn xs' + (pr.name === o.name ? ' sel' : ''), onclick: () => { o = { ...pr }; renderForm(); } }, pr.name))),
          h('div', { class: 'row' }, sel('Tejado', 'roof', A.BUILD_OPTIONS.roof), color('Color del tejado', 'roofColor'), sel('Muros', 'wall', A.BUILD_OPTIONS.wall), color('Puerta', 'door')),
          h('div', { class: 'row' }, sel('Ancho', 'w', [[3, '3 bloques'], [4, '4 bloques'], [5, '5 bloques'], [6, '6 bloques'], [7, '7 bloques']]), sel('Pisos', 'floors', [[1, '1 piso'], [2, '2 pisos']]), sel('Letrero', 'sign', A.BUILD_OPTIONS.sign),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!o.chimney, onchange: (e) => { o.chimney = e.target.checked; draw(); } }), 'Chimenea'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!o.flowers, onchange: (e) => { o.flowers = e.target.checked; draw(); } }), 'Jardineras')))
          : h('div', { class: 'chip-row' }, ...Object.entries(A.OBJECTS).map(([k, ob]) => h('button', { class: 'btn sm' + (k === objKey ? ' sel' : ''), onclick: () => { objKey = k; renderForm(); } }, ob.label))));
      form.querySelectorAll('select').forEach((s) => s.addEventListener('change', () => { o.w = +o.w; o.floors = +o.floors; draw(); }));
      draw();
    };
    renderForm();
    const tsSel = tilesetChooser(tsId);
    const body = h('div', { class: 'gen-layout' }, h('div', { class: 'gen-left' }, prev, h('p', { class: 'hint' }, 'Arte original de Forja. Al agregarlo se convierte en bloques del tileset y en una estructura que pones en el mapa con un clic. La puerta crea un warp automáticamente.')),
      h('div', { class: 'stack' }, form, h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', {}, 'Agregar al tileset'), tsSel), groundChooser(F.find('sprites', tsId), ground))));
    const ok = await F.dialog({ title: 'Estructuras predeterminadas', body, actions: [{ label: 'Cerrar', value: false }, { label: 'Agregar al tileset', value: true, primary: true }] });
    if (!ok) return;
    const ts = resolveTileset(tsSel.value), g = +F.$('#st-ground', body)?.value;
    o.w = +o.w; o.floors = +o.floors;
    const r = mode === 'building' ? A.building(o) : A.OBJECTS[objKey].make();
    const { stamp, warn } = F.addStructure(ts, r.img, { name: mode === 'building' ? o.name : A.OBJECTS[objKey].label, topRows: r.topRows, ground: g >= 0 ? g : null, solid: r.solid, door: r.door, credit: '' });
    F.emit('sprites'); if (stamp) F.toast(`“${stamp.name}” agregado a ${ts.name}.` + (warn.length ? ' ' + warn.join(' ') : ''));
    return stamp;
  };

  /* ---------- diálogo: generador de personajes ---------- */
  F.characterGenFlow = async () => {
    const A = F.art; let o = { ...A.CHAR_PRESETS[0] }, tick = 0;
    const prev = h('canvas', { class: 'gen-preview char', width: 256, height: 72, 'aria-label': 'Vista previa animada' }), form = h('div', { class: 'stack' });
    let sprite = A.character(o);
    const anim = setInterval(() => {
      if (!document.body.contains(prev)) return clearInterval(anim);
      const c = prev.getContext('2d'); c.fillStyle = '#8fce7a'; c.fillRect(0, 0, 256, 72); tick++;
      ['down', 'left', 'right', 'up'].forEach((d, i) => F.drawFrame(c, sprite, F.WALK[d][tick % 4], 4 + i * 64, 4, 2, d === 'right'));
    }, 133);
    const rebuild = () => { sprite = A.character(o); };
    const sel = (label, key, opts) => h('label', { class: 'field' }, h('span', {}, label), h('select', { onchange: (e) => { o[key] = e.target.value; rebuild(); } }, ...opts.map(([v, l]) => h('option', { value: v, selected: o[key] === v }, l))));
    const color = (label, key) => h('label', { class: 'field' }, h('span', {}, label), h('input', { type: 'color', value: F.snapHex(o[key] || '#888888'), oninput: (e) => { o[key] = e.target.value; rebuild(); } }));
    const check = (label, key) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!o[key], onchange: (e) => { o[key] = e.target.checked; rebuild(); } }), label);
    const nameIn = h('input', { id: 'cg-name', value: o.name });
    const renderForm = () => {
      nameIn.value = o.name;
      form.replaceChildren(
        h('div', { class: 'chip-row' }, ...A.CHAR_PRESETS.map((pr) => h('button', { class: 'btn xs' + (pr.name === o.name ? ' sel' : ''), onclick: () => { o = { ...pr }; rebuild(); renderForm(); } }, pr.name))),
        h('div', { class: 'row' }, sel('Piel', 'skin', A.CHAR_OPTIONS.skin), sel('Peinado', 'hairStyle', A.CHAR_OPTIONS.hairStyle), color('Pelo', 'hair')),
        h('div', { class: 'row' }, sel('En la cabeza', 'hat', A.CHAR_OPTIONS.hat), color('Color', 'hatColor'), sel('Ropa', 'outfit', A.CHAR_OPTIONS.outfit)),
        h('div', { class: 'row' }, color('Arriba', 'top'), color('Abajo', 'bottom'), color('Zapatos', 'shoes'), check('Rayas', 'stripes'), check('Mochila', 'bag')));
    };
    renderForm();
    const body = h('div', { class: 'stack' }, prev, form, h('label', { class: 'field' }, h('span', {}, 'Nombre del sprite'), nameIn),
      h('p', { class: 'hint' }, 'Crea los 9 cuadros del personaje del mapa en el orden de la GBA. Después puedes retocarlo a mano en Pixel.'));
    const ok = await F.dialog({ title: 'Generador de personajes', body, actions: [{ label: 'Cancelar', value: false }, { label: 'Crear personaje', value: true, primary: true }] });
    clearInterval(anim);
    if (!ok) return null;
    const s = A.character({ ...o, name: nameIn.value.trim() || o.name }); s.name = nameIn.value.trim() || o.name;
    F.state.project.sprites.push(s); F.emit('sprites'); F.toast('Personaje creado: ' + s.name);
    return s;
  };

  /* ---------- créditos de las estructuras importadas ---------- */
  F.creditsText = () => {
    const lines = [];
    F.state.project.sprites.filter((s) => s.kind === 'tileset').forEach((ts) => (ts.stamps || []).filter((st) => st.credit).forEach((st) => lines.push(`- ${st.name} (${ts.name}): ${st.credit}`)));
    return lines.length ? `CRÉDITOS — ${F.state.project.name}\r\n\r\nGráficos de terceros usados en este proyecto:\r\n${lines.join('\r\n')}\r\n` : '';
  };
})();
