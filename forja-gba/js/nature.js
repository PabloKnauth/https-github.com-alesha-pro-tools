/* Forja GBA — naturaleza pulida: terrenos con bordes automáticos, hierba alta, flores, árboles y bosques.
   Todo es arte original generado con reglas de pixel art de la época GBA: rampas de 4-6 tonos,
   luz desde arriba a la izquierda, tramado ordenado en las transiciones y contorno oscuro de color. */
'use strict';
(() => {
  const F = window.F, A = F.art, T = 16;
  const N = (F.nature = {});
  const rgb = (hex) => F.hexToRgb(F.snapHex(hex));
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
  const hash = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };

  /* ---------- paletas de materiales ---------- */
  N.C = {
    grass: ['#4f9a4f', '#68b85e', '#82cc72', '#a6e08e'],          // oscuro, medio, base, luz
    path: ['#8a6840', '#b8945e', '#d6b67c', '#eed49e'],
    sand: ['#b8a060', '#d8c27e', '#ecdc9c', '#faf2c8'],
    water: ['#2c58a8', '#3e74cc', '#4f8ce0', '#7cb2f0', '#c8e6fa'],  // profundo, oscuro, base, luz, espuma
    bank: ['#6e5038', '#94704c'],
    leaf: ['#1d4a2c', '#2c6a3a', '#3f8a4a', '#5aa85a', '#82c870', '#b4e494'], // contorno → brillo
    bark: ['#3e2818', '#5e3e26', '#7e5634', '#a07448'],
    rock: ['#3e3a44', '#6a6672', '#94909c', '#bcb8c4', '#e0dce6'],
  };

  /* ---------- texturas que se repiten cada 16 px ---------- */
  const grassPx = (x, y, variant) => {
    const g = N.C.grass;
    // matitas en forma de “v” como en los juegos de GBA
    const tufts = [[[3, 4], [11, 11]], [[10, 3], [4, 12], [13, 8]], [[6, 7]]][variant % 3];
    for (const [tx, ty] of tufts) {
      if ((y === ty && (x === tx || x === tx + 2)) || (y === ty + 1 && x === tx + 1)) return g[0];
      if (y === ty - 1 && (x === tx || x === tx + 2)) return g[3];
    }
    if (hash(x, y, 7 + variant) > 0.965) return g[1];
    return g[2];
  };
  const pathPx = (x, y) => { const c = N.C.path, r = hash(x, y, 3); if (r > 0.93) return c[1]; if (r < 0.05) return c[3]; if ((x * 5 + y * 3) % 23 === 0) return c[1]; return c[2]; };
  const sandPx = (x, y) => { const c = N.C.sand; if ((x + 2 * y) % 8 === 0 && y % 4 === 1) return c[1]; if ((x + 2 * y) % 8 === 4 && y % 4 === 3) return c[3]; return c[2]; };
  const waterPx = (x, y) => {
    const c = N.C.water, w = Math.round(Math.sin(((x + (y >> 3) * 5) / 16) * Math.PI * 2) * 1.5);
    if ((y + w) % 8 === 2 && (x + y) % 16 < 9) return c[3];
    if ((y + w) % 8 === 3 && (x + y) % 16 < 9) return c[1];
    return c[2];
  };
  N.TERRAINS = [
    { id: 0, key: 'pasto', label: 'Pasto', px: grassPx },
    { id: 1, key: 'tierra', label: 'Tierra / camino', px: pathPx, rim: N.C.path[0], inner: N.C.path[1], outer: N.C.grass[1] },
    { id: 2, key: 'arena', label: 'Arena', px: sandPx, rim: N.C.sand[0], inner: N.C.sand[3], outer: N.C.grass[1] },
    { id: 3, key: 'agua', label: 'Agua', px: waterPx, rim: N.C.water[4], inner: N.C.water[1], outer: N.C.bank[0], outer2: N.C.bank[1], solid: true },
  ];

  /* ---------- bloque de terreno a partir de las 4 esquinas ---------- */
  // corners: [arriba-izq, arriba-der, abajo-izq, abajo-der] con el id de terreno de cada vértice
  N.terrainRGBA = (corners, variant = 0) => {
    const out = new Uint8ClampedArray(T * T * 4), ter = new Int8Array((T + 2) * (T + 2));
    const ids = [...new Set(corners)];
    const at = (x, y) => {
      const u = F.clamp((x + 0.5) / T, 0, 1), v = F.clamp((y + 0.5) / T, 0, 1);
      // jitter orgánico que se anula en los bordes del bloque (para que empalme con el vecino)
      const edge = Math.min(x + 0.5, T - x - 0.5, y + 0.5, T - y - 0.5) / 4, j = (hash(x, y, 11) - 0.5) * 0.16 * F.clamp(edge, 0, 1);
      let best = 0, bv = -1;
      for (const id of ids) {
        const w = (corners[0] === id ? (1 - u) * (1 - v) : 0) + (corners[1] === id ? u * (1 - v) : 0) + (corners[2] === id ? (1 - u) * v : 0) + (corners[3] === id ? u * v : 0);
        const score = w + (id === 0 ? 0 : j) + (id === 3 ? 0.001 : 0);
        if (score > bv) { bv = score; best = id; }
      }
      return best;
    };
    for (let y = -1; y <= T; y++) for (let x = -1; x <= T; x++) ter[(y + 1) * (T + 2) + x + 1] = at(x, y);
    const get = (x, y) => ter[(F.clamp(y, -1, T) + 1) * (T + 2) + F.clamp(x, -1, T) + 1];
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const t = get(x, y), info = N.TERRAINS[t];
      const nb = [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)];
      const touch = (fn) => nb.some(fn);
      let col = info.px(x, y, variant);
      if (t !== 0) {
        if (touch((n) => n !== t && n < t)) col = info.rim;                      // borde exterior del terreno
        else if ([get(x - 2, y), get(x + 2, y), get(x, y - 2), get(x, y + 2)].some((n) => n !== t && n < t) && t !== 3) col = info.inner;
        else if (t === 3 && [get(x - 2, y), get(x + 2, y), get(x, y - 2), get(x, y + 2)].some((n) => n !== 3)) col = N.C.water[0];
        else if (t === 3 && [get(x - 3, y), get(x + 3, y), get(x, y - 3), get(x, y + 3)].some((n) => n !== 3)) col = N.C.water[1];
      } else {
        // pasto junto a otro terreno: sombra (camino/arena) u orilla de tierra (agua)
        const water = touch((n) => n === 3), other = touch((n) => n !== 0);
        if (water) col = N.TERRAINS[3].outer;
        else if ([get(x, y + 1), get(x + 1, y)].some((n) => n === 3) || [get(x, y + 2)].some((n) => n === 3)) col = N.TERRAINS[3].outer2;
        else if (other) col = N.C.grass[1];
      }
      const [r, g, b] = rgb(col), o = (y * T + x) * 4; out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
    }
    return out;
  };

  /* ---------- hierba alta y flores ---------- */
  /* Mata de hojas en punta que salen de abajo al centro (como la hierba alta de las rutas).
     Cada hoja se calcula por distancia a su eje: ancha en la base y afilada en la punta. */
  const leafFan = (c, cx, cy, s = 1, back = false, tilt = 0) => {
    const L = N.C.leaf;
    const leaves = [[-80, 7], [-55, 10], [-30, 12.5], [-8, 13.5], [14, 13], [37, 11.5], [60, 9], [84, 6.5]].map(([d, l]) => [((d + tilt) * Math.PI) / 180, l * s]);
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy;
      for (const [a, l] of leaves) {
        const dx = Math.sin(a), dy = -Math.cos(a), t = (px * dx + py * dy) / l, d = px * -dy + py * dx;
        if (t < 0 || t > 1) continue;
        const half = 1.9 * s * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.7) * (1 - t * 0.35);
        if (Math.abs(d) > half) continue;
        let col;
        if (back) col = d < 0 ? L[3] : L[2];
        else if (t > 0.8) col = L[5];
        else if (Math.abs(d) < 0.5 && t > 0.2) col = L[2];
        else col = d < 0 ? L[4] : L[3];
        c.set(x, y, col);
      }
    }
  };
  N.tallGrassRGBA = (variant = 0) => {
    const layer = new A.Rgba(T, T);
    if (variant % 2 === 0) { leafFan(layer, 8, 10, 0.7, true, 0); leafFan(layer, 8, 15.5, 1.15); }
    else { leafFan(layer, 4.5, 10, 0.65, true, -10); leafFan(layer, 11.5, 10, 0.65, true, 10); leafFan(layer, 8, 15.5, 1.1, false, 5); }
    layer.outline(N.C.leaf[0]);
    return composite(layer, 0);
  };
  N.flowersRGBA = (variant = 0) => {
    const layer = new A.Rgba(T, T), sets = [['#f06060', '#fff0f0', '#c83838'], ['#f8f0f8', '#ffffff', '#c8b8d8'], ['#f8d040', '#fff8c0', '#d0a020']];
    const [pet, hi, sh] = sets[variant % 3], spots = [[4, 5], [11, 4], [7, 11], [13, 12]].slice(0, variant % 3 === 1 ? 4 : 3);
    for (const [x, y] of spots) {
      layer.rect(x, y + 2, x, y + 3, N.C.leaf[3]); layer.set(x - 1, y + 3, N.C.leaf[4]);
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) layer.set(x + dx, y + dy, pet);
      layer.set(x - 1, y - 1, hi); layer.set(x + 1, y + 1, sh); layer.set(x, y, '#f8c030');
    }
    layer.outline(N.C.leaf[1]);
    return composite(layer, 1);
  };
  /** Pega una capa transparente sobre pasto. */
  const composite = (layer, variant) => {
    const base = N.terrainRGBA([0, 0, 0, 0], variant), d = layer.d;
    for (let i = 0; i < T * T; i++) if (d[i * 4 + 3]) base.set(d.subarray(i * 4, i * 4 + 4), i * 4);
    return base;
  };

  /* ---------- árboles con volumen ---------- */
  /** Luz sobre una esfera con tramado: devuelve el tono de una rampa. */
  const sphereTone = (nx, ny, ramp, x, y, bias = 0) => {
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), l = -0.52 * nx - 0.62 * ny + 0.58 * nz + bias;
    const t = F.clamp((l + 0.25) / 1.15, 0, 0.999) * ramp.length, i = Math.floor(t), frac = t - i;
    return ramp[Math.min(ramp.length - 1, frac > BAYER[y & 3][x & 3] ? i + 1 : i)];
  };
  const canopy = (c, cx, cy, rx, ry, seed = 1) => {
    const L = N.C.leaf, ramp = [L[1], L[2], L[3], L[4], L[5]];
    c.ellipse(cx, cy, rx, ry, (dx, dy, x, y) => sphereTone(dx, dy, ramp, x, y, -0.05));
    // bultos en el borde: silueta irregular de follaje
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + hash(k, seed, 3) * 0.4, kx = cx + Math.cos(a) * rx * 0.88, ky = cy + Math.sin(a) * ry * 0.88, kr = Math.min(rx, ry) * (0.28 + hash(k, seed, 4) * 0.1);
      c.ellipse(kx, ky, kr, kr * 0.9, (dx, dy, x, y) => { const gx = (x + 0.5 - cx) / rx, gy = (y + 0.5 - cy) / ry; return sphereTone(F.clamp(gx * 0.75 + dx * 0.3, -0.99, 0.99), F.clamp(gy * 0.75 + dy * 0.3, -0.99, 0.99), ramp, x, y, -0.02); });
    }
    // racimos que dan textura de follaje
    const clumps = 9;
    for (let k = 0; k < clumps; k++) {
      const a = hash(k, seed, 5) * Math.PI * 2, r = 0.25 + hash(k, seed, 9) * 0.55, kx = cx + Math.cos(a) * rx * r, ky = cy + Math.sin(a) * ry * r - 1, kr = 2.6 + hash(k, seed, 13) * 1.8;
      c.ellipse(kx, ky, kr, kr * 0.85, (dx, dy, x, y) => { const gx = (x + 0.5 - cx) / rx, gy = (y + 0.5 - cy) / ry; return sphereTone(gx * 0.6 + dx * 0.45, gy * 0.6 + dy * 0.45, ramp, x, y, 0.05); });
    }
  };
  const trunk = (c, cx, top, bottom, w = 6) => {
    const B = N.C.bark;
    for (let y = top; y <= bottom; y++) for (let x = Math.round(cx - w / 2); x < Math.round(cx + w / 2); x++) { const k = (x - (cx - w / 2)) / w; c.set(x, y, k < 0.3 ? B[3] : k < 0.7 ? B[2] : B[1]); }
    c.set(Math.round(cx - 1), top + 3, B[1]); c.set(Math.round(cx), bottom - 2, B[1]);
  };
  const groundShadow = (c, cx, cy, rx, ry) => c.ellipse(cx, cy, rx, ry, N.C.grass[0]);
  N.TREES = {
    redondo: { label: 'Árbol frondoso', w: 32, h: 32, topRows: 1, draw(c) { groundShadow(c, 16, 28.5, 11, 3); trunk(c, 16, 21, 29); canopy(c, 16, 12.5, 15, 12.5, 3); c.outline(N.C.leaf[0]); } },
    pino: { label: 'Pino', w: 32, h: 48, topRows: 2, draw(c) {
      groundShadow(c, 16, 44.5, 10, 3); trunk(c, 16, 37, 45, 5);
      const L = N.C.leaf, ramp = [L[1], L[2], L[3], L[4], L[5]];
      [[3, 15, 8], [10, 25, 11], [18, 34, 13], [26, 41, 15]].forEach(([top, bot, half], k) => c.poly([[16, top], [16 + half, bot], [16 + half * 0.55, bot - 1.5], [16, bot + 0.5], [16 - half * 0.55, bot - 1.5], [16 - half, bot]],
        (x, y) => sphereTone(F.clamp((x - 16) / (half + 1), -0.95, 0.95), F.clamp(((y - top) / (bot - top)) * 1.4 - 0.75, -0.95, 0.95), ramp, x, y, 0.08 - k * 0.04)));
      c.outline(L[0]);
    } },
    bosque: { label: 'Bosque (se repite)', w: 32, h: 32, topRows: 0, tile: true, draw(c) {
      c.rect(0, 0, 31, 31, N.C.leaf[1]);
      for (const [ox, oy] of [[0, -32], [-32, -16], [32, -16], [-32, 16], [32, 16], [0, 0], [0, 32]]) {
        const cx = 16 + ox, cy = 12 + oy;
        trunk(c, cx, cy + 8, cy + 17, 6); canopy(c, cx, cy, 16.5, 13, 5);
      }
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const col = c.get(x, y); if (!col) c.set(x, y, N.C.leaf[1]); }
    } },
    arbusto: { label: 'Arbusto', w: 16, h: 16, topRows: 0, draw(c) { groundShadow(c, 8, 13.5, 7, 2); canopy(c, 8, 8.5, 7.5, 6, 7); c.outline(N.C.leaf[0]); } },
    roca: { label: 'Roca', w: 16, h: 16, topRows: 0, draw(c) {
      const R = N.C.rock, ramp = [R[1], R[2], R[3], R[4]];
      groundShadow(c, 8, 13, 7, 2);
      c.poly([[2, 12], [3, 6], [7, 3], [12, 4], [14, 9], [13, 13], [4, 14]], (x, y) => sphereTone((x - 8) / 7, (y - 8.5) / 6, ramp, x, y));
      c.set(6, 6, R[4]); c.set(7, 5, R[4]); c.rect(9, 9, 11, 9, R[1]); c.outline(R[0]);
    } },
    tocon: { label: 'Tocón', w: 16, h: 16, topRows: 0, draw(c) { const B = N.C.bark; groundShadow(c, 8, 13, 7, 2); c.rect(3, 7, 12, 13, B[2]); c.rect(3, 7, 5, 13, B[3]); c.rect(10, 7, 12, 13, B[1]); c.ellipse(8, 7, 5, 2.2, '#c89c68'); c.ellipse(8, 7, 2.5, 1, B[2]); c.outline(B[0]); } },
  };
  N.treeRGBA = (key) => { const t = N.TREES[key], c = new A.Rgba(t.w, t.h); t.draw(c); return { img: c.image(), topRows: t.topRows, tile: t.tile, solid: key === 'bosque' ? 'all' : t.topRows ? 'bottom' : 'all' }; };

  /* ---------- tileset de naturaleza ---------- */
  /** Añade un bloque RGBA al tileset (reutiliza paleta y bloques idénticos). Devuelve el índice. */
  N.addBlock = (ts, rgba, behav) => {
    const img = new ImageData(new Uint8ClampedArray(rgba), T, T);
    const { stamp } = F.addStructure(ts, img, { name: '_bloque', solid: 'none' });
    if (!stamp) return 0;
    ts.stamps = ts.stamps.filter((s) => s !== stamp);
    const b = stamp.cells[0].b;
    if (behav) { ts.behav = ts.behav || {}; ts.behav[b] = behav; }
    return b;
  };
  /** Bloque para una combinación de esquinas (se genera la primera vez y se guarda). */
  N.terrainBlock = (ts, corners, variant = 0) => {
    ts.terrain = ts.terrain || {};
    const key = corners.join('') + ':' + (corners.every((v) => v === 0) ? variant : 0);
    if (ts.terrain[key] != null) return ts.terrain[key];
    const water = corners.filter((v) => v === 3).length;
    const b = N.addBlock(ts, N.terrainRGBA(corners, variant), water >= 3 ? 'water' : null);
    if (water >= 3) { ts.solid = [...new Set([...(ts.solid || []), b])]; }
    ts.terrain[key] = b;
    return b;
  };
  N.isTerrainBlock = (ts, b) => !!ts.terrain && Object.values(ts.terrain).includes(b);
  N.decor = (ts, key) => {
    ts.decor = ts.decor || {};
    if (ts.decor[key] != null) return ts.decor[key];
    const [kind, v] = key.split(':');
    const b = N.addBlock(ts, kind === 'hierba' ? N.tallGrassRGBA(+v) : N.flowersRGBA(+v), kind === 'hierba' ? 'grass' : null);
    ts.decor[key] = b; return b;
  };
  /** Crea un tileset de naturaleza con pasto, hierba alta, flores y árboles listos para usar. */
  N.createTileset = (name = 'Naturaleza') => {
    // paletas planificadas por material: cada terreno cae en colores exactos
    const pad = (cols) => { const p = ['#73c5a4', ...cols.map(F.snapHex)]; while (p.length < 16) p.push('#000000'); return p.slice(0, 16); };
    const C = N.C;
    const pals = [
      pad([...C.grass, ...C.path, ...C.sand, ...C.bank, C.water[2]]),                 // 0: pasto, tierra, arena
      pad([...C.grass, ...C.water, ...C.bank, ...C.sand.slice(1, 4)]),                   // 1: agua y orillas
      pad([...C.grass, ...C.leaf, ...C.bark.slice(0, 4), '#c89c68']),                    // 2: árboles y hierba
      pad([...C.grass, ...C.rock, ...C.leaf.slice(1, 4), '#f06060', '#f8f0f8', '#f8d040']), // 3: rocas y flores
    ];
    const ts = F.newSprite('tileset', name, { palette: pals[0] });
    ts.extraPalettes = pals.slice(1).map((p) => p.slice());
    ts.h = 16; ts.frames = [new Uint8Array(ts.w * 16)];
    const block0 = N.terrainRGBA([0, 0, 0, 0], 0), P0 = pals[0].map(F.hexToRgb);
    for (let i = 0; i < T * T; i++) { const c = [block0[i * 4], block0[i * 4 + 1], block0[i * 4 + 2]]; let bi = 1, bd = Infinity; for (let j = 1; j < 16; j++) { const d = (c[0] - P0[j][0]) ** 2 + (c[1] - P0[j][1]) ** 2 + (c[2] - P0[j][2]) ** 2; if (d < bd) { bd = d; bi = j; } } ts.frames[0][Math.floor(i / T) * ts.w + (i % T)] = bi; }
    ts.terrain = { '0000:0': 0 }; ts.solid = []; ts.behav = {}; ts.stamps = [];
    N.terrainBlock(ts, [0, 0, 0, 0], 1); N.terrainBlock(ts, [0, 0, 0, 0], 2);
    ['hierba:0', 'hierba:1', 'flores:0', 'flores:1', 'flores:2'].forEach((k) => N.decor(ts, k));
    for (const key of ['redondo', 'pino', 'bosque', 'arbusto', 'roca', 'tocon']) {
      const r = N.treeRGBA(key);
      F.addStructure(ts, r.img, { name: N.TREES[key].label, topRows: r.topRows, ground: r.tile ? null : 0, solid: r.solid });
    }
    return ts;
  };

  /* ---------- pintar terrenos en un mapa ---------- */
  N.ensureVtx = (m) => { if (!m.vtx || m.vtx.length !== (m.w + 1) * (m.h + 1)) m.vtx = new Array((m.w + 1) * (m.h + 1)).fill(0); return m.vtx; };
  const cornersOf = (m, x, y) => { const W = m.w + 1, v = m.vtx; return [v[y * W + x], v[y * W + x + 1], v[(y + 1) * W + x], v[(y + 1) * W + x + 1]]; };
  /** Recalcula los bloques de terreno alrededor de una celda (no toca casas ni decoraciones). */
  N.refresh = (m, ts, x0, y0, x1, y1, force) => {
    for (let y = Math.max(0, y0); y <= Math.min(m.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(m.w - 1, x1); x++) {
      const k = y * m.w + x, curB = m.bottom[k];
      if (!force && !N.isTerrainBlock(ts, curB)) continue;
      const c = cornersOf(m, x, y), b = N.terrainBlock(ts, c, hash(x, y, 1) > 0.82 ? (hash(x, y, 2) > 0.5 ? 1 : 2) : 0);
      m.bottom[k] = b; m.coll[k] = c.filter((v) => v === 3).length >= 3 ? 1 : (N.isTerrainBlock(ts, curB) || force ? 0 : m.coll[k]);
    }
  };
  /** Pinta un terreno en un cuadrado de `size` celdas con esquina en (x, y). */
  N.paint = (m, ts, terrain, x, y, size = 1) => {
    N.ensureVtx(m); const W = m.w + 1;
    for (let vy = y; vy <= y + size; vy++) for (let vx = x; vx <= x + size; vx++) if (vx >= 0 && vy >= 0 && vx <= m.w && vy <= m.h) m.vtx[vy * W + vx] = terrain;
    N.refresh(m, ts, x, y, x + size - 1, y + size - 1, true);
    N.refresh(m, ts, x - 1, y - 1, x + size, y + size, false);
  };
  N.paintDecor = (m, ts, key, x, y) => { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return; const k = y * m.w + x; m.bottom[k] = N.decor(ts, key); m.coll[k] = 0; };

  /* ---------- proyecto de ejemplo con la naturaleza nueva ---------- */
  /** Rehace el mapa de ejemplo (Pueblo Brisa) con terrenos, árboles y casas generados. */
  N.buildSample = (p) => {
    const ts = N.createTileset('Naturaleza'), m = p.maps[0];
    p.sprites = p.sprites.filter((s) => s.kind !== 'tileset');
    p.sprites.unshift(ts);
    const stamp = (name) => ts.stamps.find((s) => s.name === name);
    // personajes con el generador
    const hero = p.sprites.find((s) => s.id === 'spr_hero'), npc = p.sprites.find((s) => s.id === 'spr_npc');
    if (hero) Object.assign(hero, F.art.character({ ...F.art.CHAR_PRESETS[0] }), { id: 'spr_hero', name: 'Protagonista', player: true });
    if (npc) Object.assign(npc, F.art.character({ name: 'Vecina', skin: 'media', hairStyle: 'largo', hair: '#784898', hat: 'ninguno', outfit: 'vestido', top: '#48a868', bottom: '#48a868', shoes: '#704830' }), { id: 'spr_npc', name: 'Vecina' });
    // casas y objetos generados
    const add = (o) => F.addStructure(ts, F.art.building(o).img, { name: o.name, ground: 0, solid: 'all', door: F.art.building(o).door }).stamp;
    const casa = add({ ...F.art.BUILD_PRESETS[0], name: 'Casa de la vecina' });
    const casa2 = add({ ...F.art.BUILD_PRESETS[1] });
    for (const k of ['cartel', 'valla', 'buzon', 'farol']) { const r = F.art.OBJECTS[k].make(); F.addStructure(ts, r.img, { name: F.art.OBJECTS[k].label, topRows: r.topRows, ground: 0, solid: r.solid }); }
    // mapa
    Object.assign(m, { tileset: ts.id, bottom: new Array(m.w * m.h).fill(0), top: new Array(m.w * m.h).fill(-1), coll: new Array(m.w * m.h).fill(0) });
    m.vtx = null; N.ensureVtx(m); N.refresh(m, ts, 0, 0, m.w - 1, m.h - 1, true);
    const paint = (t, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) N.paint(m, ts, t, x, y, 1); };
    paint(1, 9, 0, 10, 14);          // camino norte-sur
    paint(1, 3, 8, 16, 9);           // camino este-oeste
    paint(2, 12, 10, 18, 13);        // playa
    paint(3, 13, 11, 17, 13);        // estanque
    for (let y = 3; y <= 5; y++) for (let x = 13; x <= 17; x++) N.paintDecor(m, ts, 'hierba:' + ((x + y) % 2), x, y);
    for (const [x, y, v] of [[6, 11, 0], [7, 12, 1], [4, 12, 2], [15, 7, 0], [12, 6, 1]]) N.paintDecor(m, ts, 'flores:' + v, x, y);
    F.placeStamp(m, casa, 2, 4, ts);
    F.placeStamp(m, casa2, 13, 0, ts);
    const tree = stamp('Árbol frondoso'), pine = stamp('Pino'), bush = stamp('Arbusto'), rock = stamp('Roca');
    for (const [x, y] of [[0, 0], [2, 0], [4, 0], [6, 0], [17, 0]]) F.placeStamp(m, x === 17 ? pine : tree, x, y - (x === 17 ? 1 : 0), ts);
    for (const [x, y] of [[0, 12], [2, 12], [18, 4], [18, 7]]) F.placeStamp(m, tree, x, y, ts);
    for (const [x, y] of [[0, 3], [0, 6], [7, 3]]) F.placeStamp(m, pine, x, y, ts);
    F.placeStamp(m, bush, 11, 12, ts); F.placeStamp(m, bush, 12, 12, ts); F.placeStamp(m, rock, 7, 6, ts);
    F.placeStamp(m, stamp('Cartel'), 12, 7, ts);
    const fence = stamp('Valla'); for (let x = 2; x <= 7; x++) F.placeStamp(m, fence, x, 14, ts);
    m.events = m.events.filter((e) => e.type !== 'warp');
    m.events.forEach((e) => { if (e.type === 'sign') { e.x = 12; e.y = 7; } });
    return p;
  };

  /* el generador de estructuras usa los árboles y objetos pulidos */
  const objs = {};
  for (const key of ['redondo', 'pino', 'bosque', 'arbusto', 'roca', 'tocon']) objs[key] = { label: N.TREES[key].label, make: () => N.treeRGBA(key) };
  objs.flores = { label: 'Flores', make: () => { const d = N.flowersRGBA(0), img = new ImageData(new Uint8ClampedArray(T * T * 4), T, T), g = N.terrainRGBA([0, 0, 0, 0], 0); for (let i = 0; i < T * T; i++) if (d[i * 4] !== g[i * 4] || d[i * 4 + 1] !== g[i * 4 + 1] || d[i * 4 + 2] !== g[i * 4 + 2]) img.data.set(d.subarray(i * 4, i * 4 + 4), i * 4); return { img, topRows: 0, solid: 'none' }; } };
  F.art.OBJECTS = { ...objs, valla: F.art.OBJECTS.valla, cartel: F.art.OBJECTS.cartel, buzon: F.art.OBJECTS.buzon, farol: F.art.OBJECTS.farol };
})();
