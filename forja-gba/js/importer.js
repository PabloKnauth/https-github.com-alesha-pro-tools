/* Forja GBA — importador de imágenes: detecta escala, reduce a 15 colores + transparente y adapta al formato GBA. */
'use strict';
(() => {
  const F = window.F;

  F.readImageFile = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url);
      resolve(ctx.getImageData(0, 0, c.width, c.height));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen. Usa PNG, GIF o JPG.')); };
    img.src = url;
  });

  /** Mayor factor k tal que la imagen está hecha de bloques k×k idénticos (sprites ampliados).
      Acepta un desfase de la cuadrícula (ox, oy) y una tolerancia mínima de píxeles sueltos. */
  F.detectScale = (img) => {
    const { width: w, height: h, data } = img;
    let opaque = 0; for (let i = 3; i < data.length; i += 4) if (data[i] >= 128) opaque++;
    const tol = Math.max(4, Math.round(opaque * 0.003));
    for (const k of [6, 5, 4, 3, 2]) {
      if (w < k * 8 || h < k * 8) continue;
      for (let oy = 0; oy < k; oy++) for (let ox = 0; ox < k; ox++) {
        let bad = 0;
        for (let y = oy; y < h && bad <= tol; y++) for (let x = ox; x < w; x++) {
          const bx = x - ((x - ox) % k), by = y - ((y - oy) % k), a = (y * w + x) * 4, b = (by * w + bx) * 4;
          const ta = data[a + 3] < 128, tb = data[b + 3] < 128;
          if (ta && tb) continue;
          if (ta !== tb || data[a] !== data[b] || data[a + 1] !== data[b + 1] || data[a + 2] !== data[b + 2]) { if (++bad > tol) break; }
        }
        if (bad <= tol) return { k, ox, oy };
      }
    }
    return { k: 1, ox: 0, oy: 0 };
  };
  const downscale = (img, sc) => {
    const { k, ox, oy } = sc; if (k === 1) return img;
    const w = Math.floor((img.width - ox) / k), h = Math.floor((img.height - oy) / k), out = new ImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = ((oy + y * k) * img.width + ox + x * k) * 4, d = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) out.data[d + c] = img.data[s + c];
    }
    return out;
  };

  /** Reduce a 15 colores (corte por mediana sobre colores ya ajustados a 15 bits). */
  F.quantize = (img, maxColors = 15, bgKey = null) => {
    const { data } = img, n = img.width * img.height, counts = new Map(), opaque = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const o = i * 4; if (data[o + 3] < 128) continue;
      const r = F.snap8(data[o]), g = F.snap8(data[o + 1]), b = F.snap8(data[o + 2]), key = (r << 16) | (g << 8) | b;
      if (bgKey !== null && key === bgKey) continue;
      opaque[i] = key; counts.set(key, (counts.get(key) || 0) + 1);
    }
    let colors = [...counts.entries()].map(([k, c]) => ({ rgb: [(k >> 16) & 255, (k >> 8) & 255, k & 255], c }));
    let palette;
    if (colors.length <= maxColors) palette = colors.map((x) => x.rgb);
    else {
      let boxes = [colors];
      while (boxes.length < maxColors) {
        let bi = -1, best = -1, bch = 0;
        boxes.forEach((box, i) => {
          if (box.length < 2) return;
          for (let ch = 0; ch < 3; ch++) {
            let mn = 255, mx = 0; for (const x of box) { mn = Math.min(mn, x.rgb[ch]); mx = Math.max(mx, x.rgb[ch]); }
            const weight = (mx - mn) * Math.sqrt(box.reduce((a, x) => a + x.c, 0));
            if (weight > best) { best = weight; bi = i; bch = ch; }
          }
        });
        if (bi < 0) break;
        const box = boxes[bi].sort((a, b) => a.rgb[bch] - b.rgb[bch]);
        const total = box.reduce((a, x) => a + x.c, 0); let acc = 0, cut = 1;
        for (let i = 0; i < box.length - 1; i++) { acc += box[i].c; if (acc >= total / 2) { cut = i + 1; break; } }
        boxes.splice(bi, 1, box.slice(0, cut), box.slice(cut));
      }
      palette = boxes.map((box) => {
        const t = box.reduce((a, x) => a + x.c, 0);
        return [0, 1, 2].map((ch) => F.snap8(box.reduce((a, x) => a + x.rgb[ch] * x.c, 0) / t));
      });
    }
    // ordenar de oscuro a claro para que la paleta sea fácil de leer
    palette.sort((a, b) => (a[0] * 0.3 + a[1] * 0.59 + a[2] * 0.11) - (b[0] * 0.3 + b[1] * 0.59 + b[2] * 0.11));
    const cache = new Map(), px = new Uint8Array(n);
    const nearest = (key) => {
      if (cache.has(key)) return cache.get(key);
      const r = (key >> 16) & 255, g = (key >> 8) & 255, b = key & 255; let bi = 0, bd = Infinity;
      palette.forEach((p, i) => { const d = (p[0] - r) ** 2 * 3 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 2; if (d < bd) { bd = d; bi = i; } });
      cache.set(key, bi + 1); return bi + 1;
    };
    for (let i = 0; i < n; i++) if (opaque[i] >= 0) px[i] = nearest(opaque[i]);
    const hexes = palette.map((p) => F.rgbToHex(...p));
    // color 0 (transparente): uno que no se use, como en los juegos originales
    const pal = ['#73c5a4', ...hexes]; while (pal.length < 16) pal.push('#000000');
    return { palette: pal, px, w: img.width, h: img.height, lost: Math.max(0, colors.length - maxColors) };
  };

  const crop = (q, x0, y0, w, h) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x0 + x, sy = y0 + y;
      if (sx >= 0 && sy >= 0 && sx < q.w && sy < q.h) out[y * w + x] = q.px[sy * q.w + sx];
    }
    return { px: out, w, h };
  };
  const bbox = (q) => {
    let x0 = q.w, y0 = q.h, x1 = -1, y1 = -1;
    for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (q.px[y * q.w + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  const scaleNearest = (q, w, h) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = q.px[Math.floor((y * q.h) / h) * q.w + Math.floor((x * q.w) / w)];
    return { px: out, w, h };
  };
  /** Coloca el contenido centrado y apoyado abajo dentro de W×H; reduce si no cabe. */
  const fit = (q, W, H, warn) => {
    const bb = bbox(q); if (!bb) return new Uint8Array(W * H);
    let c = crop(q, bb.x0, bb.y0, bb.w, bb.h);
    if (c.w <= W && c.h > H && c.h - H <= 8) {
      warn.push('Medía ' + c.h + ' px de alto: se recortaron ' + (c.h - H) + ' px de la parte de abajo para que quepa en ' + H + ' px.');
      c = crop(c, 0, 0, c.w, H);
    }
    if (c.w > W || c.h > H) {
      const s = Math.min(W / c.w, H / c.h); c = scaleNearest(c, Math.max(1, Math.floor(c.w * s)), Math.max(1, Math.floor(c.h * s)));
      warn.push('La imagen no cabía en ' + W + '×' + H + ' y se redujo. Revisa el resultado y retoca los píxeles.');
    }
    return crop(c, -Math.floor((W - c.w) / 2), -(H - c.h), W, H).px;
  };

  /** Formatos que se reconocen automáticamente. */
  F.guessImport = (w, h, k) => {
    const W = w / k, H = h / k;
    if (W === 32 && H === 64) return 'icon';
    if (W === 64 && H === 128) return 'front';
    if (W === 64 && H === 64) return 'front';
    if (w === 160 && h === 160) return 'trainer';
    if ((k >= 2 && w === h && W % 4 === 0 && W >= 64 && W <= 192) || (w === 128 && h === 192)) return 'charset';
    if (W === 128 && H % 16 === 0) return 'tileset';
    if (W < 48 && H < 48) return 'free';
    if (W <= 96 && H <= 96) return 'trainer';
    return 'free';
  };
  F.IMPORT_MODES = {
    charset: 'Hoja de personaje 4×4 (RPG Maker / Essentials) → personaje del mapa GBA',
    front: 'Fakemon de frente (64×64; si mide 64×128 trae 2 cuadros)',
    back: 'Fakemon de espalda (64×64)',
    icon: 'Ícono del equipo (32×32, 2 cuadros apilados)',
    trainer: 'Entrenador para el combate (64×64)',
    tileset: 'Tileset de bloques de 16×16',
    free: 'Imagen libre (se conserva el tamaño)',
  };

  /** Convierte una imagen al sprite del proyecto. */
  F.imageToSprite = (img, mode, name, opts = {}) => {
    const warn = [];
    const sc = opts.scale || F.detectScale(img), k = sc.k;
    let src = downscale(img, sc);
    let bgKey = null;
    let hasAlpha = false; for (let i = 3; i < src.data.length; i += 4) if (src.data[i] < 128) { hasAlpha = true; break; }
    if (!hasAlpha) { const d = src.data; bgKey = (F.snap8(d[0]) << 16) | (F.snap8(d[1]) << 8) | F.snap8(d[2]); warn.push('La imagen no tenía transparencia: el color de la esquina se usó como fondo.'); }
    const q = F.quantize(src, 15, bgKey);
    if (q.lost) warn.push('Tenía ' + (q.lost + 15) + ' colores; se redujo a 15 (el límite de la GBA).');
    let sprite;
    if (mode === 'charset') {
      const small = opts.small;
      sprite = F.newSprite(small ? 'overworld_small' : 'overworld', name, { palette: q.palette });
      const cw = q.w / 4, ch = q.h / 4;
      // Essentials: filas abajo, izquierda, derecha, arriba · columnas quieto, paso, quieto, paso
      const cells = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cells.push(crop(q, c * cw, r * ch, cw, ch));
      const map = [[0, 0], [3, 0], [1, 0], [0, 1], [0, 3], [3, 1], [3, 3], [1, 1], [1, 3]];
      // caja común a todos los cuadros para que no "salten" al animarse
      let u = null;
      for (const cell of cells) { const b = bbox(cell); if (!b) continue; u = u ? { x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) } : b; }
      u = u || { x0: 0, y0: 0, x1: cw - 1, y1: ch - 1 };
      const uw = u.x1 - u.x0 + 1, uh = u.y1 - u.y0 + 1, W = sprite.w, H = sprite.h;
      if (uw > W || uh > H) warn.push('El personaje mide ' + uw + '×' + uh + ' px y el cuadro GBA es ' + W + '×' + H + '. Se reducirá; conviene redibujarlo más pequeño.');
      map.forEach(([r, c], i) => {
        let part = crop(cells[r * 4 + c], u.x0, u.y0, uw, uh);
        if (uw > W || uh > H) { const s = Math.min(W / uw, H / uh); part = scaleNearest(part, Math.floor(uw * s), Math.floor(uh * s)); }
        sprite.frames[i] = crop(part, -Math.floor((W - part.w) / 2), -(H - part.h), W, H).px;
      });
    } else if (mode === 'free' || mode === 'tileset') {
      const W = Math.ceil(q.w / 8) * 8, H = Math.ceil(q.h / (mode === 'tileset' ? 16 : 8)) * (mode === 'tileset' ? 16 : 8);
      sprite = F.newSprite(mode, name, { w: mode === 'tileset' ? 128 : W, h: H, frames: 1, palette: q.palette });
      sprite.frames[0] = crop(q, 0, 0, sprite.w, H).px;
    } else {
      sprite = F.newSprite(mode, name, { palette: q.palette });
      const W = sprite.w, H = sprite.h, n = sprite.frames.length;
      if (n > 1 && q.w === W && q.h === H * n) for (let i = 0; i < n; i++) sprite.frames[i] = crop(q, 0, i * H, W, H).px;
      else if (n > 1 && q.h === H && q.w === W * n) for (let i = 0; i < n; i++) sprite.frames[i] = crop(q, i * W, 0, W, H).px;
      else { sprite.frames[0] = fit(q, W, H, warn); for (let i = 1; i < n; i++) sprite.frames[i] = sprite.frames[0].slice(); }
    }
    if (k > 1) warn.unshift('Estaba ampliada ×' + k + ': se devolvió a su tamaño real de píxel.');
    return { sprite, warn, scale: k };
  };

  /** Diálogo de importación con vista previa. */
  F.importFlow = async (file) => {
    let img; try { img = await F.readImageFile(file); } catch (e) { F.toast(e.message, 'error'); return null; }
    const k = F.detectScale(img).k, guess = F.guessImport(img.width, img.height, k);
    const sel = F.h('select', { id: 'imp-mode' }, ...Object.entries(F.IMPORT_MODES).map(([v, l]) => F.h('option', { value: v, selected: v === guess }, l)));
    const nameIn = F.h('input', { id: 'imp-name', value: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') });
    const prev = F.h('div', { class: 'imp-preview' }), notes = F.h('ul', { class: 'imp-notes' });
    const render = () => {
      const { sprite, warn } = F.imageToSprite(img, sel.value, nameIn.value);
      prev.replaceChildren(...sprite.frames.slice(0, 9).map((_, i) => F.h('figure', {}, F.thumb(sprite, i, 64), F.h('figcaption', {}, F.frameName(sprite, i)))));
      notes.replaceChildren(...(warn.length ? warn : ['Todo encaja sin cambios.']).map((w) => F.h('li', {}, w)));
    };
    sel.addEventListener('change', render); render();
    const body = F.h('div', { class: 'stack' },
      F.h('p', { class: 'muted' }, 'Archivo de ' + img.width + '×' + img.height + ' px. ' + (k > 1 ? 'Detecté que está ampliado ×' + k + '.' : '')),
      F.h('label', { class: 'field' }, F.h('span', {}, '¿Qué es?'), sel),
      F.h('label', { class: 'field' }, F.h('span', {}, 'Nombre'), nameIn), prev, notes);
    const ok = await F.dialog({ title: 'Importar imagen', body, actions: [{ label: 'Cancelar', value: false }, { label: 'Importar', value: true, primary: true }] });
    if (!ok) return null;
    const { sprite } = F.imageToSprite(img, sel.value, nameIn.value);
    F.state.project.sprites.push(sprite); F.emit('sprites');
    F.toast('Importado: ' + sprite.name);
    return sprite;
  };
})();
