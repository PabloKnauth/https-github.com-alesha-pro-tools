/* Forja GBA — generadores de arte original: personajes del mapa, edificios y objetos de exterior. */
'use strict';
(() => {
  const F = window.F;
  const A = (F.art = {});

  /* ---------- lienzo de índices (personajes, paleta fija de 16) ---------- */
  class Idx {
    constructor(w, h) { this.w = w; this.h = h; this.px = new Uint8Array(w * h); }
    get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : 0; }
    set(x, y, v) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = v; }
    rect(x0, y0, x1, y1, v) { for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) this.set(x, y, v); }
    ellipse(cx, cy, rx, ry, v, dark, light) {
      for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy > 1) continue;
        this.set(x, y, dark != null && dx * 0.7 + dy > 0.62 ? dark : light != null && dx * 0.8 + dy < -0.78 ? light : v);
      }
    }
    outline(v) { const src = this.px.slice(); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { if (src[y * this.w + x]) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < this.w && ny < this.h && src[ny * this.w + nx]) { this.px[y * this.w + x] = v; break; } } } }
    swap(from, to, y0, y1) { for (let y = y0; y <= y1; y++) for (let x = 0; x < this.w; x++) if (this.px[y * this.w + x] === from) this.px[y * this.w + x] = to; }
  }

  /* ---------- personajes del mapa (9 cuadros de 32×32) ---------- */
  A.SKINS = { clara: ['#f8d0a8', '#d09070'], media: ['#e0a878', '#a86840'], morena: ['#b07850', '#784830'] };
  A.CHAR_OPTIONS = {
    skin: [['clara', 'Clara'], ['media', 'Media'], ['morena', 'Morena']],
    hairStyle: [['corto', 'Corto'], ['largo', 'Largo'], ['coleta', 'Coleta'], ['punta', 'De punta'], ['calvo', 'Calvo']],
    hat: [['gorra', 'Gorra'], ['sombrero', 'Sombrero'], ['gorro', 'Gorro de lana'], ['panuelo', 'Pañuelo'], ['ninguno', 'Nada']],
    outfit: [['camiseta', 'Camiseta y pantalón'], ['vestido', 'Vestido'], ['bata', 'Bata de laboratorio'], ['abrigo', 'Abrigo largo']],
  };
  A.CHAR_PRESETS = [
    { name: 'Chico entrenador', skin: 'clara', hairStyle: 'corto', hair: '#5a3020', hat: 'gorra', hatColor: '#e04020', outfit: 'camiseta', top: '#3878d0', bottom: '#4a5268', shoes: '#383030', bag: true },
    { name: 'Chica entrenadora', skin: 'clara', hairStyle: 'largo', hair: '#a86830', hat: 'sombrero', hatColor: '#f0f0e8', outfit: 'vestido', top: '#e04858', bottom: '#e04858', shoes: '#d06878', bag: true },
    { name: 'Entrenador de gorra negra', skin: 'clara', hairStyle: 'corto', hair: '#382820', hat: 'gorra', hatColor: '#383840', outfit: 'camiseta', top: '#58b8e8', stripes: true, bottom: '#303040', shoes: '#4888c8', bag: true },
    { name: 'Profesora', skin: 'media', hairStyle: 'coleta', hair: '#784898', hat: 'ninguno', outfit: 'bata', top: '#58a070', bottom: '#585868', shoes: '#504040' },
    { name: 'Científico', skin: 'clara', hairStyle: 'corto', hair: '#303030', hat: 'ninguno', outfit: 'bata', top: '#5078c0', bottom: '#40404c', shoes: '#383030' },
    { name: 'Niño', skin: 'morena', hairStyle: 'punta', hair: '#282028', hat: 'ninguno', outfit: 'camiseta', top: '#f0c030', bottom: '#3868b0', shoes: '#c03828' },
    { name: 'Abuelo', skin: 'clara', hairStyle: 'calvo', hair: '#d8d8d8', hat: 'ninguno', outfit: 'abrigo', top: '#8a6848', bottom: '#585048', shoes: '#383030' },
    { name: 'Excursionista', skin: 'media', hairStyle: 'corto', hair: '#4a3020', hat: 'gorro', hatColor: '#38a058', outfit: 'abrigo', top: '#c87838', bottom: '#585048', shoes: '#584030', bag: true },
    { name: 'Marinera', skin: 'morena', hairStyle: 'largo', hair: '#201818', hat: 'panuelo', hatColor: '#3058b8', outfit: 'camiseta', top: '#f0f0f0', stripes: true, bottom: '#3058b8', shoes: '#303038' },
    { name: 'Deportista', skin: 'clara', hairStyle: 'coleta', hair: '#e0b048', hat: 'ninguno', outfit: 'camiseta', top: '#f07830', bottom: '#303848', shoes: '#f0f0f0' },
    { name: 'Pescador', skin: 'media', hairStyle: 'corto', hair: '#5a4030', hat: 'sombrero', hatColor: '#d8b868', outfit: 'abrigo', top: '#507848', bottom: '#4a5268', shoes: '#584030' },
  ];
  const shades = (hex) => { const r = F.ramp(hex, 5); return { dark: r[1], mid: F.snapHex(hex), light: r[3] }; };
  A.charPalette = (o) => {
    const sk = A.SKINS[o.skin] || A.SKINS.clara, hr = shades(o.hair || '#5a3020'), ht = shades(o.hatColor || '#e04020'), tp = shades(o.top || '#3878d0'), bt = shades(o.bottom || '#4a5268');
    return ['#73c5a4', '#202028', F.snapHex(sk[1]), F.snapHex(sk[0]), hr.dark, hr.mid, ht.dark, ht.mid, ht.light, tp.dark, tp.mid, bt.dark, bt.mid, F.snapHex(o.shoes || '#383030'), '#f8f8f8', o.bag ? F.snapHex(o.bagColor || '#c84838') : '#80c0f8'].map(F.snapHex);
  };
  /* dir: down | up | left · phase: 0 quieto, 1 paso A, 2 paso B */
  A.charFrame = (o, dir, phase) => {
    const c = new Idx(32, 32), bob = phase ? 1 : 0, hx = dir === 'left' ? 15 : 15.5, ix = Math.floor(hx);
    const dress = o.outfit === 'vestido', long = o.outfit === 'bata' || o.outfit === 'abrigo';
    // piernas
    const legs = dir === 'left' ? { 0: [[14, 15, 0], [17, 18, 0]], 1: [[12, 14, 0], [18, 19, -1]], 2: [[15, 17, -1], [16, 18, 0]] }[phase]
      : { 0: [[12, 14, 0], [17, 19, 0]], 1: [[12, 14, -1], [17, 19, 0]], 2: [[12, 14, 0], [17, 19, -1]] }[phase];
    for (const [x0, x1, lift] of legs) {
      const col = dress ? 3 : 12, colD = dress ? 2 : 11;
      c.rect(x0, 25 + lift, x1, 28 + lift, col); c.rect(x1, 25 + lift, x1, 28 + lift, colD); c.rect(x0, 29 + lift, x1, 29 + lift, 13);
    }
    // cuerpo
    const bodyBottom = long ? 27 : dress ? 25 : 25, coat = o.outfit === 'bata' ? 14 : 10, coatD = o.outfit === 'bata' ? 9 : 9;
    if (dir === 'left') {
      c.rect(13, 18 - bob, 19, bodyBottom - bob, long ? coat : 10); c.rect(18, 18 - bob, 19, bodyBottom - bob, long && o.outfit === 'bata' ? 1 : 9);
      if (o.outfit === 'bata') c.rect(18, 18 - bob, 19, bodyBottom - bob, 14);
      if (dress) for (let y = 22; y <= 25; y++) c.rect(13 - (y - 22 > 1 ? 1 : 0), y - bob, 20 + (y - 22 > 1 ? 1 : 0), y - bob, y === 25 ? 9 : 10);
      if (o.bag) { c.rect(19, 18 - bob, 21, 24 - bob, 15); c.rect(21, 19 - bob, 21, 24 - bob, 1); }
      const arm = phase === 1 ? 1 : phase === 2 ? -1 : 0;
      c.rect(15 + arm, 20 - bob, 16 + arm, 24 - bob, long ? (o.outfit === 'bata' ? 14 : 9) : 9); c.rect(15 + arm, 25 - bob, 16 + arm, 25 - bob, 3);
    } else {
      c.rect(11, 18 - bob, 20, bodyBottom - bob, long ? coat : 10); c.rect(19, 18 - bob, 20, bodyBottom - bob, o.outfit === 'bata' ? 14 : 9);
      if (dress) for (let y = 22; y <= 25; y++) { const g = y - 22 > 1 ? 1 : 0; c.rect(11 - g, y - bob, 20 + g, y - bob, 10); c.set(20 + g, y - bob, 9); }
      if (o.outfit === 'bata' && dir === 'down') c.rect(15, 18 - bob, 16, 22 - bob, 10);
      if (o.outfit === 'abrigo' && dir === 'down') for (let y = 20; y <= 25; y += 2) c.set(15, y - bob, 9);
      if (o.outfit === 'camiseta' && dir === 'down' && !o.stripes) c.rect(15, 18 - bob, 16, 19 - bob, 14);
      if (o.bag && dir === 'up') { c.rect(12, 18 - bob, 19, 24 - bob, 15); c.rect(12, 24 - bob, 19, 24 - bob, 1); c.rect(13, 20 - bob, 18, 20 - bob, 1); }
      if (o.bag && dir === 'down') { c.rect(12, 18 - bob, 12, 23 - bob, 15); c.rect(19, 18 - bob, 19, 23 - bob, 15); }
      const la = phase === 2 ? -1 : 0, ra = phase === 1 ? -1 : 0, sleeve = long && o.outfit === 'bata' ? 14 : 10;
      c.rect(9, 19 - bob + la, 10, 23 - bob + la, sleeve); c.rect(9, 24 - bob + la, 10, 24 - bob + la, 3);
      c.rect(21, 19 - bob + ra, 22, 23 - bob + ra, o.outfit === 'bata' ? 14 : 9); c.rect(21, 24 - bob + ra, 22, 24 - bob + ra, 2);
    }
    if (o.stripes) for (let y = 19; y <= bodyBottom; y += 2) { c.swap(10, 14, y - bob, y - bob); c.swap(9, 14, y - bob, y - bob); }
    // cabeza
    c.ellipse(hx + 0.5, 12.5 - bob, 6.5, 6, 3, 2);
    const hair = o.hairStyle || 'corto';
    if (hair === 'largo') {
      if (dir === 'up') c.rect(ix - 6, 12 - bob, ix + 7, 20 - bob, 5);
      else if (dir === 'left') c.rect(ix + 2, 12 - bob, ix + 7, 20 - bob, 5);
      else { c.rect(ix - 7, 11 - bob, ix - 5, 20 - bob, 5); c.rect(ix + 6, 11 - bob, ix + 8, 20 - bob, 4); }
    }
    if (hair === 'coleta') { if (dir === 'up') c.rect(ix - 1, 15 - bob, ix + 1, 21 - bob, 5); else if (dir === 'left') c.rect(ix + 6, 12 - bob, ix + 8, 18 - bob, 5); }
    if (dir === 'up') { if (hair !== 'calvo') c.ellipse(hx + 0.5, 12 - bob, 6.5, 5.8, 5, 4); else c.rect(ix - 6, 13 - bob, ix + 7, 15 - bob, 5); }
    else if (dir === 'left') {
      if (hair !== 'calvo') c.ellipse(hx + 2.5, 12 - bob, 4.5, 5.6, 5, 4); else c.rect(ix + 3, 12 - bob, ix + 6, 15 - bob, 5);
      c.rect(ix - 3, 13 - bob, ix - 3, 14 - bob, 1); c.set(ix - 6, 15 - bob, 3);
    } else {
      if (hair !== 'calvo') { c.rect(ix - 6, 11 - bob, ix - 5, 15 - bob, 5); c.rect(ix + 6, 11 - bob, ix + 7, 15 - bob, 4); }
      else { c.rect(ix - 6, 12 - bob, ix - 6, 15 - bob, 5); c.rect(ix + 7, 12 - bob, ix + 7, 15 - bob, 4); }
      c.rect(ix - 3, 13 - bob, ix - 3, 14 - bob, 1); c.rect(ix + 3, 13 - bob, ix + 3, 14 - bob, 1);
    }
    // sombrero o pelo de arriba
    const hat = o.hat || 'ninguno';
    if (hat === 'gorra') {
      c.ellipse(hx + 0.5, 9 - bob, 7, 4.5, 7, 6, 8); c.rect(ix - 6, 10 - bob, ix + 7, 11 - bob, 7);
      if (dir === 'down') c.rect(ix - 5, 11 - bob, ix + 6, 11 - bob, 6); else if (dir === 'left') c.rect(ix - 9, 10 - bob, ix - 4, 11 - bob, 6);
      c.set(ix, 6 - bob, 14);
    } else if (hat === 'sombrero') {
      c.ellipse(hx + 0.5, 10.5 - bob, 9.5, 2.4, 7, 6); c.ellipse(hx + 0.5, 7.5 - bob, 5.5, 3.8, 7, 6, 8); c.rect(ix - 5, 9 - bob, ix + 6, 9 - bob, 6);
    } else if (hat === 'gorro') {
      c.ellipse(hx + 0.5, 9 - bob, 7, 5.2, 7, 6, 8); c.rect(ix - 6, 10 - bob, ix + 7, 11 - bob, 6); c.set(ix, 3 - bob, 8); c.set(ix + 1, 3 - bob, 8);
    } else if (hat === 'panuelo') {
      if (hair !== 'calvo') c.ellipse(hx + 0.5, 9.5 - bob, 6.8, 4.5, 5, 4);
      c.rect(ix - 6, 8 - bob, ix + 7, 10 - bob, 7); c.rect(ix - 6, 10 - bob, ix + 7, 10 - bob, 6);
      if (dir !== 'down') { c.rect(ix + 6, 10 - bob, ix + 8, 13 - bob, 7); c.set(ix + 8, 13 - bob, 6); }
    } else if (hair === 'calvo') {
      c.ellipse(hx + 0.5, 9.5 - bob, 6.2, 4, 3, 2);
    } else {
      c.ellipse(hx + 0.5, 9.5 - bob, 6.8, 4.6, 5, 4);
      if (dir === 'down') { c.rect(ix - 5, 11 - bob, ix + 6, 11 - bob, 5); c.set(ix - 2, 12 - bob, 5); c.set(ix + 2, 12 - bob, 5); }
      if (hair === 'punta') for (const sx of [-4, -1, 2, 5]) { c.set(ix + sx, 5 - bob, 5); c.set(ix + sx, 4 - bob, 5); c.set(ix + sx + 1, 5 - bob, 4); }
    }
    c.outline(1);
    return c.px;
  };
  A.character = (o) => {
    const seq = [['down', 0], ['up', 0], ['left', 0], ['down', 1], ['down', 2], ['up', 1], ['up', 2], ['left', 1], ['left', 2]];
    const s = F.newSprite('overworld', o.name || 'Personaje', { palette: A.charPalette(o) });
    s.frames = seq.map(([d, p]) => A.charFrame(o, d, p));
    s.gen = { ...o };
    return s;
  };

  /* ---------- lienzo RGBA (edificios y objetos) ---------- */
  class Rgba {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
    set(x, y, hex) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h || !hex) return; const [r, g, b] = F.hexToRgb(hex), o = (y * this.w + x) * 4; this.d[o] = r; this.d[o + 1] = g; this.d[o + 2] = b; this.d[o + 3] = 255; }
    get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; const o = (y * this.w + x) * 4; return this.d[o + 3] ? F.rgbToHex(this.d[o], this.d[o + 1], this.d[o + 2]) : null; }
    rect(x0, y0, x1, y1, hex) { for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) this.set(x, y, hex); }
    poly(pts, fn) {
      const ys = pts.map((p) => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
        const xs = [];
        for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; if ((y0 <= y + 0.5 && y + 0.5 < y1) || (y1 <= y + 0.5 && y + 0.5 < y0)) xs.push(x0 + ((y + 0.5 - y0) * (x1 - x0)) / (y1 - y0)); }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, typeof fn === 'function' ? fn(x, y) : fn);
      }
    }
    ellipse(cx, cy, rx, ry, fn) { for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, typeof fn === 'function' ? fn(dx, dy, x, y) : fn); } }
    outline(hex) { const src = this.d.slice(); const on = (x, y) => x >= 0 && y >= 0 && x < this.w && y < this.h && src[(y * this.w + x) * 4 + 3]; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!on(x, y) && (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1))) this.set(x, y, hex); }
    image() { return new ImageData(this.d, this.w, this.h); }
  }
  A.Rgba = Rgba;
  const tone = (hex) => { const r = F.ramp(hex, 6); return { d2: r[0], d1: r[1], m: F.snapHex(hex), l1: r[3], l2: r[4] }; };
  const OUT = '#283038';

  /* ---------- edificios ---------- */
  A.BUILD_OPTIONS = {
    roof: [['teja', 'Tejado inclinado'], ['dos_aguas', 'A dos aguas (frontón)'], ['plano', 'Plano']],
    wall: [['yeso', 'Yeso'], ['tablas', 'Tablas blancas'], ['madera', 'Madera'], ['ladrillo', 'Ladrillo'], ['piedra', 'Piedra']],
    sign: [['', 'Sin letrero'], ['tienda', 'Tienda (franja azul)'], ['centro', 'Centro de curación (cruz)'], ['lab', 'Laboratorio'], ['gym', 'Gimnasio (estrella)']],
  };
  A.BUILD_PRESETS = [
    { name: 'Casa de tejado rojo', w: 4, floors: 1, roof: 'teja', roofColor: '#d84838', wall: 'yeso', door: '#8a5a30', chimney: true },
    { name: 'Casa de dos aguas verde', w: 4, floors: 1, roof: 'dos_aguas', roofColor: '#68a858', wall: 'tablas', door: '#58a050' },
    { name: 'Cabaña de madera', w: 3, floors: 1, roof: 'dos_aguas', roofColor: '#c84838', wall: 'madera', door: '#d04040' },
    { name: 'Casa de dos pisos azul', w: 5, floors: 2, roof: 'teja', roofColor: '#3878c8', wall: 'ladrillo', door: '#3868b8' },
    { name: 'Casa de ladrillo', w: 4, floors: 1, roof: 'plano', roofColor: '#d85050', wall: 'ladrillo', door: '#c83838' },
    { name: 'Tienda', w: 4, floors: 1, roof: 'plano', roofColor: '#4888d8', wall: 'yeso', door: '#88c8f0', sign: 'tienda' },
    { name: 'Centro de curación', w: 5, floors: 1, roof: 'teja', roofColor: '#e05858', wall: 'yeso', door: '#88c8f0', sign: 'centro' },
    { name: 'Laboratorio', w: 6, floors: 1, roof: 'plano', roofColor: '#9098a8', wall: 'tablas', door: '#5878b8', sign: 'lab' },
    { name: 'Gimnasio', w: 6, floors: 2, roof: 'teja', roofColor: '#e08838', wall: 'piedra', door: '#88c8f0', sign: 'gym' },
  ];
  A.building = (o) => {
    const W = F.clamp(o.w || 4, 3, 8) * 16, floors = o.floors === 2 ? 2 : 1, H = (floors === 2 ? 5 : 4) * 16 - (floors === 1 && o.roof === 'plano' ? 16 : 0);
    const c = new Rgba(W, H), R = tone(o.roofColor || '#d84838');
    const roofH = o.roof === 'dos_aguas' ? Math.min(34, Math.round(W * 0.42) + 6) : o.roof === 'plano' ? 18 : 26;
    const wallTop = roofH, wx0 = 2, wx1 = W - 3, wy1 = H - 2;
    const WALLS = { yeso: '#f0e8d0', tablas: '#e8ecf0', madera: '#b07840', ladrillo: '#c06848', piedra: '#a8a8b0' };
    const Wt = tone(WALLS[o.wall] || WALLS.yeso);
    // muros
    for (let y = wallTop; y <= wy1; y++) for (let x = wx0; x <= wx1; x++) {
      let col = Wt.m; const ly = y - wallTop;
      if (o.wall === 'tablas' && ly % 3 === 2) col = Wt.d1;
      if (o.wall === 'madera') { if (ly % 4 === 3) col = Wt.d2; else if (ly % 4 === 0) col = Wt.l1; }
      if (o.wall === 'ladrillo') { const row = Math.floor(ly / 4), off = row % 2 ? 4 : 0; if (ly % 4 === 3 || (x + off) % 8 === 0) col = Wt.l2; }
      if (o.wall === 'piedra') { const row = Math.floor(ly / 5), off = row % 2 ? 5 : 0; if (ly % 5 === 4 || (x + off) % 10 === 0) col = Wt.d2; else if ((x * 7 + y * 3) % 11 === 0) col = Wt.l1; }
      if (o.wall === 'yeso' && ly > (wy1 - wallTop) * 0.75) col = Wt.d1;
      if (x <= wx0 + 1 || x >= wx1 - 1) col = Wt.d2;
      c.set(x, y, col);
    }
    c.rect(wx0, wy1 - 1, wx1, wy1, '#787068'); c.rect(wx0, wy1 - 1, wx1, wy1 - 1, '#989088');
    if (floors === 2) c.rect(wx0, wallTop + 22, wx1, wallTop + 23, Wt.d2);
    // tejado
    if (o.roof === 'teja') {
      c.poly([[0, roofH], [W, roofH], [W - 6, 2], [6, 2]], (x, y) => (y >= roofH - 2 ? R.d2 : y <= 3 ? R.l2 : (y - 2) % 4 === 3 ? R.d1 : x < W * 0.12 + (roofH - y) * 0.2 ? R.d1 : x > W * 0.82 ? R.l1 : R.m));
    } else if (o.roof === 'dos_aguas') {
      const cx = W / 2;
      c.poly([[-1, roofH], [cx, 0], [W + 1, roofH]], (x, y) => { const left = x < cx; const k = (left ? x + y : W - x + y) % 5; return k === 0 ? R.d1 : left ? R.m : R.l1; });
      const g = 9; // frontón con el material del muro
      c.poly([[g + 3, roofH], [cx, g], [W - g - 3, roofH]], (x, y) => ((y % 3 === 2 && o.wall !== 'yeso') ? Wt.d1 : Wt.m));
      c.ellipse(cx, roofH - 8, 3, 3, (dx, dy) => (dx + dy < -0.6 ? '#f8f8f8' : '#88c8f0'));
      c.rect(0, roofH - 1, W - 1, roofH, R.d2);
    } else {
      c.rect(1, 2, W - 2, roofH, R.m); c.rect(3, 4, W - 4, roofH - 3, R.l1); c.rect(5, 6, W - 6, roofH - 5, R.m); c.rect(1, roofH - 1, W - 2, roofH, R.d2);
      if (o.sign !== 'lab') c.rect(W - 16, 7, W - 9, 11, R.d1);
      else for (let x = 10; x < W - 10; x += 8) c.rect(x, 7, x + 4, 10, '#c8d8e8');
    }
    if (o.chimney) { const x = Math.round(W * 0.68); c.rect(x, 0, x + 5, 10, '#a04838'); c.rect(x, 0, x + 5, 1, '#6a3028'); }
    // puerta, ventanas y letrero
    const doorW = o.sign === 'centro' || o.sign === 'gym' || o.sign === 'tienda' ? 14 : 10, doorH = 15, dx0 = Math.round(W / 2 - doorW / 2) + (o.sign ? 0 : (o.w % 2 ? 0 : 8)), dy0 = wy1 - 1 - doorH;
    const Dt = tone(o.door || '#8a5a30');
    c.rect(dx0 - 1, dy0 - 1, dx0 + doorW, wy1 - 2, OUT); c.rect(dx0, dy0, dx0 + doorW - 1, wy1 - 2, Dt.m); c.rect(dx0, dy0, dx0 + 1, wy1 - 2, Dt.l1); c.rect(dx0 + doorW - 2, dy0, dx0 + doorW - 1, wy1 - 2, Dt.d1);
    if (doorW > 12) { c.rect(dx0 + doorW / 2, dy0, dx0 + doorW / 2, wy1 - 2, Dt.d2); c.rect(dx0 + 2, dy0 + 2, dx0 + 4, dy0 + 6, '#f8f8f8'); } else c.set(dx0 + doorW - 3, dy0 + 8, '#f0c040');
    const win = (x, y) => { c.rect(x - 1, y - 1, x + 11, y + 9, OUT); c.rect(x, y, x + 10, y + 8, '#78b8e8'); c.rect(x, y, x + 3, y + 2, '#d8f0f8'); c.rect(x + 5, y, x + 5, y + 8, '#f8f8f8'); c.rect(x, y + 4, x + 10, y + 4, '#f8f8f8'); c.rect(x - 1, y + 9, x + 11, y + 9, Wt.d2); };
    const rows = floors === 2 ? [wallTop + 6, wy1 - 15] : [wy1 - 15];
    const slots = []; for (let x = 6; x + 12 < W - 5; x += 16) if (x + 12 < dx0 - 3 || x > dx0 + doorW + 3) slots.push(x);
    rows.forEach((y, ri) => slots.forEach((x) => win(x, y)));
    if (floors === 2) for (let x = Math.round(W / 2 - 5); x <= Math.round(W / 2 - 5); x++) win(x, wallTop + 6);
    if (o.sign) {
      const sx0 = dx0 - 6, sx1 = dx0 + doorW + 5, sy0 = dy0 - 8, sy1 = dy0 - 3;
      const col = { tienda: '#3870c8', centro: '#d84848', lab: '#606878', gym: '#e08838' }[o.sign];
      c.rect(sx0 - 1, sy0 - 1, sx1 + 1, sy1 + 1, OUT); c.rect(sx0, sy0, sx1, sy1, col);
      const mid = Math.round((sx0 + sx1) / 2);
      if (o.sign === 'tienda') for (let x = sx0 + 2; x < sx1 - 1; x += 3) c.rect(x, sy0 + 2, x + 1, sy0 + 3, '#f8f8f8');
      if (o.sign === 'centro') { c.rect(mid - 1, sy0 + 1, mid + 1, sy1 - 1, '#f8f8f8'); c.rect(mid - 3, sy0 + 2, mid + 3, sy0 + 3, '#f8f8f8'); }
      if (o.sign === 'lab') c.rect(mid - 3, sy0 + 1, mid + 3, sy1 - 1, '#88c8f0');
      if (o.sign === 'gym') { c.set(mid, sy0 + 1, '#f8e070'); c.rect(mid - 2, sy0 + 2, mid + 2, sy0 + 2, '#f8e070'); c.rect(mid - 1, sy0 + 3, mid + 1, sy0 + 3, '#f8e070'); c.set(mid - 2, sy0 + 4, '#f8e070'); c.set(mid + 2, sy0 + 4, '#f8e070'); }
    }
    c.outline(OUT);
    return { img: c.image(), topRows: 0, solid: 'all', door: { x: Math.floor((dx0 + doorW / 2) / 16), y: Math.floor(H / 16) - 1 } };
  };

  /* ---------- objetos de exterior ---------- */
  const G = { d2: '#184828', d1: '#28703a', m: '#3c9a48', l1: '#68c058', l2: '#a8e078' };
  A.OBJECTS = {
    pino: { label: 'Pino', make() {
      const c = new Rgba(32, 48);
      c.rect(14, 38, 18, 46, '#6a4428'); c.rect(17, 38, 18, 46, '#4a2c18');
      [[2, 16, 9], [10, 26, 12], [19, 38, 15]].forEach(([top, bot, half]) => c.poly([[16, top], [16 + half, bot], [16 - half, bot]], (x, y) => (y >= bot - 1 ? G.d2 : x > 16 + (y - top) * 0.25 ? G.l1 : x < 16 - (y - top) * 0.45 ? G.d1 : (x + y) % 6 === 0 ? G.l1 : G.m)));
      c.set(15, 4, G.l2); c.set(20, 18, G.l2); c.set(22, 30, G.l2);
      c.outline('#103020'); return { img: c.image(), topRows: 1, solid: 'bottom' };
    } },
    redondo: { label: 'Árbol redondo', make() {
      const c = new Rgba(32, 32);
      c.rect(13, 22, 18, 30, '#7a4c28'); c.rect(16, 22, 18, 30, '#5a3418');
      c.ellipse(16, 12, 14, 11.5, (dx, dy) => (dx * 0.7 + dy > 0.62 ? G.d1 : dx * 0.8 + dy < -0.78 ? G.l1 : G.m));
      [[9, 7], [20, 9], [13, 15], [22, 16], [8, 16]].forEach(([x, y]) => { c.ellipse(x, y, 3, 2.2, G.l1); c.set(x - 1, y - 1, G.l2); });
      c.outline('#103020'); return { img: c.image(), topRows: 1, solid: 'bottom' };
    } },
    arbusto: { label: 'Arbusto', make() { const c = new Rgba(16, 16); c.ellipse(8, 9, 7.5, 6, (dx, dy) => (dx * 0.7 + dy > 0.6 ? G.d1 : dx * 0.8 + dy < -0.7 ? G.l1 : G.m)); c.set(5, 6, G.l2); c.outline('#103020'); return { img: c.image(), topRows: 0, solid: 'all' }; } },
    roca: { label: 'Roca', make() { const c = new Rgba(16, 16); c.ellipse(8, 9, 6.5, 5.5, (dx, dy) => (dx * 0.7 + dy > 0.6 ? '#787078' : dx * 0.8 + dy < -0.6 ? '#d0c8c8' : '#a8a0a0')); c.set(6, 7, '#e8e0e0'); c.outline('#403838'); return { img: c.image(), topRows: 0, solid: 'all' }; } },
    flores: { label: 'Flores', make() { const c = new Rgba(16, 16); [[4, 4, '#f05858'], [11, 6, '#f8f0f0'], [6, 11, '#f8d048'], [12, 12, '#f05858']].forEach(([x, y, col]) => { for (const [a, b] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) c.set(x + a, y + b, col); c.set(x, y, '#f8c030'); c.set(x, y + 2, G.d1); }); return { img: c.image(), topRows: 0, solid: 'none' }; } },
    valla: { label: 'Valla', make() { const c = new Rgba(16, 16); c.rect(0, 5, 15, 6, '#e8d0a0'); c.rect(0, 7, 15, 7, '#a07848'); c.rect(0, 10, 15, 10, '#e8d0a0'); c.rect(0, 11, 15, 11, '#a07848'); for (const x of [2, 12]) { c.rect(x, 2, x + 2, 14, '#e8d0a0'); c.rect(x + 2, 2, x + 2, 14, '#a07848'); } c.outline('#504030'); return { img: c.image(), topRows: 0, solid: 'all' }; } },
    cartel: { label: 'Cartel', make() { const c = new Rgba(16, 16); c.rect(7, 9, 8, 15, '#6a4428'); c.rect(2, 2, 13, 9, '#c89858'); c.rect(3, 3, 12, 8, '#e8c890'); c.rect(4, 4, 10, 4, '#8a5a30'); c.rect(4, 6, 11, 6, '#8a5a30'); c.outline('#403020'); return { img: c.image(), topRows: 0, solid: 'all' }; } },
    buzon: { label: 'Buzón', make() { const c = new Rgba(16, 16); c.rect(7, 8, 8, 15, '#585858'); c.rect(3, 2, 12, 8, '#d84838'); c.rect(3, 2, 12, 3, '#f07858'); c.rect(4, 5, 8, 5, '#801818'); c.rect(12, 1, 13, 4, '#f8d048'); c.outline('#302020'); return { img: c.image(), topRows: 0, solid: 'all' }; } },
    farol: { label: 'Farol', make() { const c = new Rgba(16, 32); c.rect(7, 10, 8, 30, '#48505a'); c.rect(5, 29, 10, 31, '#38404a'); c.rect(4, 2, 11, 9, '#38404a'); c.rect(5, 3, 10, 8, '#f8e890'); c.rect(5, 3, 7, 5, '#fff8d0'); c.rect(3, 1, 12, 2, '#283038'); c.outline('#202830'); return { img: c.image(), topRows: 1, solid: 'bottom' }; } },
  };
})();
