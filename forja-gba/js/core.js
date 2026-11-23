/* Forja GBA — núcleo: estado del proyecto, color GBA, PNG indexado, ZIP, guardado. */
'use strict';
const F = (window.F = window.F || {});

/* ---------- utilidades ---------- */
F.$ = (sel, root = document) => root.querySelector(sel);
F.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
F.uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
F.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
F.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
F.h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
};
/** Nombre de constante: "Fuego Ñandú" -> "FUEGO_NANDU" */
F.constName = (s) =>
  String(s || 'SIN_NOMBRE').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'SIN_NOMBRE';
F.camel = (s) => F.constName(s).toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
F.fileName = (s) => F.constName(s).toLowerCase();

/* ---------- color GBA (15 bits: 5 por canal) ---------- */
F.hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
F.rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
F.c5to8 = (c) => (c << 3) | (c >> 2);
F.snap8 = (v) => F.c5to8(Math.round((F.clamp(v, 0, 255) * 31) / 255));
F.snapHex = (hex) => { const [r, g, b] = F.hexToRgb(hex); return F.rgbToHex(F.snap8(r), F.snap8(g), F.snap8(b)); };
F.rgb555 = (hex) => { const [r, g, b] = F.hexToRgb(hex).map((v) => Math.round((v * 31) / 255)); return r | (g << 5) | (b << 10); };
F.rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  return [h, s, l];
};
F.hslToHex = (h, s, l) => {
  h = ((h % 360) + 360) % 360; s = F.clamp(s, 0, 1); l = F.clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return F.snapHex(F.rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)));
};
/** Rampa de sombreado estilo pixel art: las sombras giran hacia azul/violeta, las luces hacia amarillo. */
F.ramp = (hex, n = 4) => {
  const [h, s, l] = F.rgbToHsl(...F.hexToRgb(hex));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5 (oscuro) .. 0.5 (claro)
    const hueShift = t < 0 ? 18 * t * 2 * (h > 60 && h < 240 ? -1 : 1) : -14 * t * 2 * (h > 60 && h < 240 ? -1 : 1);
    out.push(F.hslToHex(h - hueShift, s * (1 - Math.abs(t) * 0.25), F.clamp(l + t * 0.62, 0.06, 0.95)));
  }
  return out;
};
F.shinyOf = (colors) => colors.map((c, i) => { if (i === 0) return c; const [h, s, l] = F.rgbToHsl(...F.hexToRgb(c)); return F.hslToHex(h + 150, s, l); });

/* ---------- serialización de píxeles (1 dígito hex por píxel, 16 colores) ---------- */
F.pxToStr = (px) => { let s = ''; for (let i = 0; i < px.length; i++) s += px[i].toString(16); return s; };
F.strToPx = (s, n) => { const px = new Uint8Array(n); for (let i = 0; i < n && i < s.length; i++) px[i] = parseInt(s[i], 16) || 0; return px; };

/* ---------- plantillas de sprites (medidas reales del hardware / decomp) ---------- */
F.TEMPLATES = {
  overworld: {
    label: 'Personaje en el mapa', w: 32, h: 32, frames: 9,
    help: '9 cuadros en el orden del juego. El lado derecho se genera volteando el izquierdo.',
    names: ['Abajo · quieto', 'Arriba · quieto', 'Izquierda · quieto', 'Abajo · paso 1', 'Abajo · paso 2', 'Arriba · paso 1', 'Arriba · paso 2', 'Izquierda · paso 1', 'Izquierda · paso 2'],
  },
  overworld_small: { label: 'Personaje pequeño en el mapa', w: 16, h: 32, frames: 9, help: 'Formato clásico de 16×32 para NPC.', names: null },
  front: { label: 'Fakemon · frente', w: 64, h: 64, frames: 2, help: 'Cuadro 1: pose normal. Cuadro 2: animación al entrar en combate.', names: ['Pose', 'Animación'] },
  back: { label: 'Fakemon · espalda', w: 64, h: 64, frames: 1, help: 'Lo que ves de tu criatura durante el combate.', names: ['Espalda'] },
  icon: { label: 'Fakemon · ícono del equipo', w: 32, h: 32, frames: 2, help: 'Los dos cuadros se alternan en el menú del equipo.', names: ['Ícono 1', 'Ícono 2'] },
  trainer: { label: 'Entrenador · combate', w: 64, h: 64, frames: 1, help: 'Imagen del rival al empezar el combate.', names: ['Frente'] },
  tileset: { label: 'Tileset (bloques del mapa)', w: 128, h: 128, frames: 1, help: 'Cada cuadro de 16×16 es un bloque que podrás pintar en el mapa (64 bloques).', names: ['Tileset'] },
  free: { label: 'Libre', w: 32, h: 32, frames: 1, help: 'Tamaño a tu gusto (múltiplos de 8).', names: null },
};
F.frameName = (sprite, i) => { const t = F.TEMPLATES[sprite.kind]; return (t && t.names && t.names[i]) || 'Cuadro ' + (i + 1); };

/* Animación estándar del juego para personajes: cada cuadro dura 8 ticks a 60 fps (7.5 fps). */
F.WALK = {
  down: [3, 0, 4, 0], up: [5, 1, 6, 1], left: [7, 2, 8, 2], right: [7, 2, 8, 2],
  stand: { down: 0, up: 1, left: 2, right: 2 },
};

F.DEFAULT_PALETTE = ['#73c5a4', '#000000', '#ffffff', '#ded6ce', '#9c948c', '#5a5252', '#f7c5a4', '#d68c6b', '#ff5a39', '#b52918', '#ffd65a', '#c58c18', '#5aa5ff', '#2952b5', '#63c55a', '#296b29'];

/* ---------- estado ---------- */
F.state = { project: null, view: 'inicio', dirty: false };
F.listeners = [];
F.on = (fn) => F.listeners.push(fn);
F.emit = (what) => { F.state.dirty = true; F.listeners.forEach((fn) => fn(what)); F.scheduleAutosave(); };

F.newSprite = (kind, name, opts = {}) => {
  const t = F.TEMPLATES[kind] || F.TEMPLATES.free;
  const w = opts.w || t.w, h = opts.h || t.h, n = opts.frames || t.frames;
  return {
    id: F.uid('spr'), name: name || t.label, kind, w, h, fps: kind.startsWith('overworld') ? 7.5 : 4,
    palette: (opts.palette || F.DEFAULT_PALETTE).slice(),
    frames: Array.from({ length: n }, () => new Uint8Array(w * h)),
  };
};
F.newFakemon = (name) => ({
  id: F.uid('mon'), name: name || 'Nuevo Fakemon', category: 'Criatura', types: ['NORMAL', ''],
  stats: { hp: 50, atk: 55, def: 50, spa: 45, spd: 50, spe: 60 },
  abilities: ['', ''], hidden: '', growth: 'MEDIUM_FAST', catchRate: 45, expYield: 64, genderFemale: 50,
  eggGroups: ['FIELD', ''], height: 0.6, weight: 8.5, color: 'BLUE', dex: '', evo: { into: '', method: 'LEVEL', param: 16 },
  learnset: [{ lvl: 1, move: 'Placaje' }], sprites: { front: '', back: '', icon: '' }, romSlot: '',
});
F.newMap = (name, tilesetId, w = 20, h = 15) => ({
  id: F.uid('map'), name: name || 'Mapa nuevo', w, h, tileset: tilesetId || '', music: '', weather: 'NONE',
  bottom: new Array(w * h).fill(0), top: new Array(w * h).fill(-1), coll: new Array(w * h).fill(0), events: [],
  bank: 3, num: 0, onEnter: '', wild: { rate: 20, list: [] },
});
F.newScript = (name) => ({ id: F.uid('scr'), name: name || 'Evento nuevo', steps: [] });

/* Ajustes del hack: valores por defecto tomados de los tutoriales de Escuela ROM Hack (Rojo Fuego) y de Essentials 16. */
F.DEFAULT_SETTINGS = {
  player: 'ROJO', rival: 'AZUL',
  romBase: 'BPRE', dynamic: '0x800000', firstFlag: 0x200, firstVar: 0x7fff, lineWidth: 34,
  essVersion: 'v16', essFirstNum: 722,
};
F.settings = () => F.state.project.settings;
F.blankProject = () => ({ format: 'forja-gba', version: 2, name: 'Mi Hack', settings: { ...F.DEFAULT_SETTINGS }, sprites: [], fakemons: [], maps: [], scripts: [] });
F.find = (kind, id) => (F.state.project[kind] || []).find((x) => x.id === id);

/* ---------- guardar / cargar ---------- */
F.serialize = (p = F.state.project) => JSON.stringify({ ...p, sprites: p.sprites.map((s) => ({ ...s, frames: s.frames.map(F.pxToStr) })) });
F.deserialize = (json) => {
  const p = typeof json === 'string' ? JSON.parse(json) : json;
  if (p.format !== 'forja-gba') throw new Error('Este archivo no es un proyecto de Forja GBA.');
  p.sprites = (p.sprites || []).map((s) => ({ ...s, frames: s.frames.map((f) => (typeof f === 'string' ? F.strToPx(f, s.w * s.h) : Uint8Array.from(f))) }));
  for (const k of ['fakemons', 'maps', 'scripts']) p[k] = p[k] || [];
  p.settings = { ...F.DEFAULT_SETTINGS, ...(p.settings || {}) };
  p.maps.forEach((m, i) => { if (m.bank == null) { m.bank = 3; m.num = i; } m.onEnter = m.onEnter || ''; m.wild = m.wild || { rate: 20, list: [] }; });
  p.fakemons.forEach((m) => { if (m.romSlot == null) m.romSlot = ''; });
  return p;
};
const LS_KEY = 'forja-gba:autosave';
let saveTimer = null;
F.scheduleAutosave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(F.autosave, 800); };
F.autosave = () => { try { localStorage.setItem(LS_KEY, F.serialize()); } catch (e) { /* almacenamiento no disponible */ } };
F.loadAutosave = () => { try { const s = localStorage.getItem(LS_KEY); return s ? F.deserialize(s) : null; } catch (e) { return null; } };

/* ---------- descarga: capability de claude.ai o enlace normal fuera de ella ---------- */
let downloadsCap;
F.initDownloads = async () => {
  try { downloadsCap = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { downloadsCap = null; }
};
F.download = async (filename, data) => {
  const blob = data instanceof Blob ? data : new Blob([data]);
  if (downloadsCap) {
    try { await downloadsCap.save({ filename, data: blob }); F.toast('Archivo listo: ' + filename); return true; }
    catch (e) { if (e && e.code === 'declined') { F.toast('Descarga cancelada'); return false; } if (e && e.code !== 'unavailable') { F.toast('No se pudo guardar: ' + (e.message || e.code), 'error'); return false; } }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  F.toast('Descargado: ' + filename);
  return true;
};

/* ---------- avisos ---------- */
F.toast = (msg, kind = 'ok') => {
  let box = F.$('#toasts'); if (!box) return;
  const t = F.h('div', { class: 'toast ' + kind, role: 'status' }, msg);
  box.append(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700);
};
/** Diálogo propio (el visor no muestra confirm/prompt). */
F.dialog = ({ title, body, actions }) => new Promise((resolve) => {
  const back = F.h('div', { class: 'modal-back' });
  const close = (v) => { back.remove(); resolve(v); };
  const box = F.h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    F.h('h3', {}, title), typeof body === 'string' ? F.h('p', {}, body) : body,
    F.h('div', { class: 'modal-actions' }, ...(actions || [{ label: 'Aceptar', value: true, primary: true }]).map((a) =>
      F.h('button', { class: 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : ''), onclick: () => close(typeof a.value === 'function' ? a.value() : a.value) }, a.label))));
  back.append(box); back.addEventListener('mousedown', (e) => { if (e.target === back) close(null); });
  document.body.append(back);
  const first = box.querySelector('input,select,textarea,button.primary'); if (first) first.focus();
});
F.confirm = (title, body, label = 'Sí, continuar') => F.dialog({ title, body, actions: [{ label: 'Cancelar', value: false }, { label, value: true, primary: true, danger: true }] });

/* ---------- PNG indexado (4 bpp) sin dependencias ---------- */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
F.crc32 = (buf, crc = 0xffffffff) => { for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; };
const adler32 = (buf) => { let a = 1, b = 0; for (let i = 0; i < buf.length; i++) { a = (a + buf[i]) % 65521; b = (b + a) % 65521; } return ((b << 16) | a) >>> 0; };
const zlibStored = (data) => {
  const blocks = Math.ceil(data.length / 65535) || 1; const out = new Uint8Array(2 + data.length + blocks * 5 + 4); let o = 0;
  out[o++] = 0x78; out[o++] = 0x01;
  for (let i = 0; i < blocks; i++) {
    const chunk = data.subarray(i * 65535, (i + 1) * 65535), len = chunk.length;
    out[o++] = i === blocks - 1 ? 1 : 0; out[o++] = len & 255; out[o++] = len >> 8; out[o++] = ~len & 255; out[o++] = (~len >> 8) & 255;
    out.set(chunk, o); o += len;
  }
  const ad = adler32(data); out[o++] = ad >>> 24; out[o++] = (ad >>> 16) & 255; out[o++] = (ad >>> 8) & 255; out[o++] = ad & 255;
  return out;
};
const u32 = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const chunk = (type, data) => {
  const t = new TextEncoder().encode(type), body = new Uint8Array(t.length + data.length); body.set(t); body.set(data, t.length);
  const out = new Uint8Array(12 + data.length); out.set(u32(data.length)); out.set(body, 4); out.set(u32(F.crc32(body)), 8 + data.length); return out;
};
/** px: Uint8Array de índices (0..15), palette: 16 colores hex. Índice 0 = transparente. */
F.encodePNG = (px, w, h, palette) => {
  const rowBytes = Math.ceil(w / 2), raw = new Uint8Array((rowBytes + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (rowBytes + 1)] = 0;
    for (let x = 0; x < w; x++) { const v = px[y * w + x] & 15, i = y * (rowBytes + 1) + 1 + (x >> 1); raw[i] |= x & 1 ? v : v << 4; }
  }
  const ihdr = new Uint8Array([...u32(w), ...u32(h), 4, 3, 0, 0, 0]);
  const plte = new Uint8Array(48); for (let i = 0; i < 16; i++) plte.set(F.hexToRgb(palette[i] || '#000000'), i * 3);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('tRNS', new Uint8Array([0])), chunk('IDAT', zlibStored(raw)), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0), png = new Uint8Array(total); let o = 0; for (const p of parts) { png.set(p, o); o += p.length; }
  return png;
};
/** Une cuadros en una hoja: layout 'h' (horizontal) o 'v' (vertical) o una grilla {cols}. */
F.sheet = (sprite, order, layout = 'h', scale = 1, cell = null) => {
  const cw = (cell ? cell.w : sprite.w) * scale, ch = (cell ? cell.h : sprite.h) * scale;
  const cols = layout === 'h' ? order.length : layout === 'v' ? 1 : layout.cols, rows = Math.ceil(order.length / cols);
  const W = cw * cols, H = ch * rows, out = new Uint8Array(W * H);
  order.forEach((spec, k) => {
    if (spec == null) return;
    const fi = typeof spec === 'object' ? spec.f : spec, flip = typeof spec === 'object' && spec.flip;
    const src = sprite.frames[fi]; if (!src) return;
    const ox = (k % cols) * cw + Math.floor((cw - sprite.w * scale) / 2), oy = Math.floor(k / cols) * ch + (ch - sprite.h * scale);
    for (let y = 0; y < sprite.h * scale; y++) for (let x = 0; x < sprite.w * scale; x++) {
      const sx = Math.floor(x / scale), sy = Math.floor(y / scale);
      out[(oy + y) * W + ox + x] = src[sy * sprite.w + (flip ? sprite.w - 1 - sx : sx)];
    }
  });
  return { px: out, w: W, h: H };
};
F.jascPal = (palette) => 'JASC-PAL\r\n0100\r\n16\r\n' + palette.slice(0, 16).map((c) => F.hexToRgb(c).join(' ')).join('\r\n') + '\r\n';

/* ---------- ZIP (sin compresión, compatible con cualquier descompresor) ---------- */
F.zip = (files) => {
  const enc = new TextEncoder(), locals = [], centrals = []; let offset = 0;
  const now = new Date(), dtime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), ddate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = F.crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dtime, true); lh.setUint16(12, ddate, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    locals.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dtime, true); ch.setUint16(14, ddate, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    centrals.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = centrals.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...locals, ...centrals, new Uint8Array(end.buffer)], { type: 'application/zip' });
};

/* ---------- dibujo de sprites en canvas (vistas previas) ---------- */
F.frameToImageData = (sprite, fi, flip = false) => {
  const img = new ImageData(sprite.w, sprite.h), src = sprite.frames[fi] || sprite.frames[0];
  const pal = sprite.palette.map(F.hexToRgb);
  for (let y = 0; y < sprite.h; y++) for (let x = 0; x < sprite.w; x++) {
    const v = src[y * sprite.w + (flip ? sprite.w - 1 - x : x)], o = (y * sprite.w + x) * 4;
    if (v === 0) continue; const c = pal[v]; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
  }
  return img;
};
const bitmapCache = new Map();
F.frameCanvas = (sprite, fi, flip = false) => {
  const c = document.createElement('canvas'); c.width = sprite.w; c.height = sprite.h;
  c.getContext('2d').putImageData(F.frameToImageData(sprite, fi, flip), 0, 0); return c;
};
F.drawFrame = (ctx, sprite, fi, x, y, scale = 1, flip = false) => {
  ctx.imageSmoothingEnabled = false; ctx.drawImage(F.frameCanvas(sprite, fi, flip), x, y, sprite.w * scale, sprite.h * scale);
};
F.thumb = (sprite, fi = 0, size = 48) => {
  const c = document.createElement('canvas'); const s = Math.max(1, Math.floor(size / Math.max(sprite.w, sprite.h)));
  c.width = sprite.w * s; c.height = sprite.h * s; c.className = 'thumb';
  F.drawFrame(c.getContext('2d'), sprite, fi, 0, 0, s); return c;
};
F.bitmapCache = bitmapCache;

/* ---------- texto de GBA ---------- */
/* Caracteres del juego de caracteres occidental de Gen 3 (tabla de Advance Map). */
F.GBA_CHARS = new Set([...' ÀÁÂÇÈÉÊËÌÎÏÒÓÔÙÚÛÑßàáçèéêëìîïòóôùúûñºª&+=;¿¡%()âíÍ<>0123456789!?.-·«»\'$,*/:ÄÖÜäöüABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz']);
F.GBA_REPLACE = { '“': '"', '”': '"', '"': '"', '‘': "'", '’': "'", '…': '...', '—': '-', '–': '-', 'ã': 'a', 'õ': 'o', 'Ã': 'A', 'Õ': 'O', 'ý': 'y' };
/** Devuelve los caracteres que la GBA no puede mostrar (ignorando [player], [rival] y saltos). */
F.gbaBadChars = (text) => {
  const bad = new Set();
  for (const ch of String(text || '').replace(/\[(player|rival)\]/gi, '').replace(/\n/g, '')) if (!F.GBA_CHARS.has(ch) && !F.GBA_REPLACE[ch]) bad.add(ch);
  return [...bad];
};
F.gbaClean = (text) => {
  const t = String(text || '').replace(/\[player\]/gi, '\u0001').replace(/\[rival\]/gi, '\u0002');
  return [...t].map((ch) => (ch === '\n' || ch === '\u0001' || ch === '\u0002' || F.GBA_CHARS.has(ch) ? ch : F.GBA_REPLACE[ch] ?? '')).join('').replace(/\u0001/g, '[player]').replace(/\u0002/g, '[rival]');
};
/** Ajusta el texto a la caja de diálogo como XSE: \n segunda línea, \l desplazar, \p página nueva. */
F.xseText = (text, width) => {
  width = width || (F.state.project && F.settings().lineWidth) || 34;
  const vis = (w) => w.replace(/\[(player|rival)\]/g, 'XXXXXXX').length;
  const paras = F.gbaClean(text).split(/\n+/).map((para) => {
    const lines = []; let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) { const t = line ? line + ' ' + w : w; if (vis(t) > width && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines.map((l, i) => (i === 0 ? '' : i % 2 === 1 ? '\\n' : '\\l') + l).join('');
  });
  return paras.join('\\p');
};
/** Texto para mostrar en la prueba: reemplaza [player] y [rival]. */
F.fillNames = (text) => String(text || '').replace(/\[player\]/gi, F.settings().player).replace(/\[rival\]/gi, F.settings().rival);
F.hex = (n) => '0x' + (Number(n) >>> 0).toString(16).toUpperCase();

/* ---------- BMP de 16 colores (lo que cargan Advance Map, NSE y unLZ-GBA) ---------- */
F.encodeBMP4 = (px, w, h, palette) => {
  const rowBytes = Math.ceil(w / 2), stride = (rowBytes + 3) & ~3, dataSize = stride * h, off = 14 + 40 + 64;
  const buf = new Uint8Array(off + dataSize), dv = new DataView(buf.buffer);
  buf[0] = 0x42; buf[1] = 0x4d; dv.setUint32(2, off + dataSize, true); dv.setUint32(10, off, true);
  dv.setUint32(14, 40, true); dv.setInt32(18, w, true); dv.setInt32(22, h, true); dv.setUint16(26, 1, true); dv.setUint16(28, 4, true);
  dv.setUint32(34, dataSize, true); dv.setUint32(38, 2835, true); dv.setUint32(42, 2835, true); dv.setUint32(46, 16, true); dv.setUint32(50, 16, true);
  for (let i = 0; i < 16; i++) { const [r, g, b] = F.hexToRgb(palette[i] || '#000000'); buf[54 + i * 4] = b; buf[55 + i * 4] = g; buf[56 + i * 4] = r; }
  for (let y = 0; y < h; y++) {
    const row = off + (h - 1 - y) * stride;
    for (let x = 0; x < w; x++) { const v = px[y * w + x] & 15; buf[row + (x >> 1)] |= x & 1 ? v : v << 4; }
  }
  return buf;
};
