/* Forja GBA — Modo prueba: camina por el mapa a 240×160 y ejecuta los eventos. */
'use strict';
(() => {
  const F = window.F, { h, $ } = F;
  const T = 16, SW = 240, SH = 160;
  const P = (F.play = { mapId: null });
  let st = null; // estado de la partida de prueba

  const passable = (m, x, y, self) => {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
    if (m.coll[y * m.w + x]) return false;
    return !m.events.some((e) => e !== self && e.type === 'sign' && e.x === x && e.y === y);
  };
  const playerSprite = () => { const p = F.state.project; return p.sprites.find((s) => s.kind.startsWith('overworld') && s.player) || p.sprites.find((s) => s.kind.startsWith('overworld')); };

  /* ---------- cuadro de diálogo estilo GBA ---------- */
  const wrap = (c, text, maxW) => { const out = []; for (const para of String(text).split('\n')) { let line = ''; for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); } return out; };
  const pages = (c, text) => { const lines = wrap(c, text, SW - 28), pg = []; for (let i = 0; i < lines.length; i += 2) pg.push(lines.slice(i, i + 2)); return pg.length ? pg : [['']]; };
  const say = (text) => new Promise((resolve) => { st.dialog = { pages: null, text: F.fillNames(text), page: 0, chars: 0, resolve }; });
  /** Muestra un texto y un menú; devuelve el índice elegido (B = última opción). */
  const menu = (text, options) => new Promise((resolve) => { st.dialog = { pages: null, text: F.fillNames(text || ' '), page: 0, chars: 0, choice: 0, menu: options, resolve }; });
  const choose = async (text) => (await menu(text, ['SÍ', 'NO'])) === 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- intérprete de eventos ---------- */
  const monName = (id) => (F.find('fakemons', id) || {}).name || 'un Fakemon';
  const run = async (steps, self) => {
    for (const s of steps) {
      if (!st || st.stopped) return;
      switch (s.op) {
        case 'msg': await say(s.text || '…'); break;
        case 'ask': { const yes = await choose(s.text); await run(yes ? s.then : s.else, self); break; }
        case 'if_flag': await run(st.flags.has(s.flag) ? s.then : s.else, self); break;
        case 'choice': { const i = await menu(s.text || '¿Qué eliges?', s.options.map((o) => o.label.toUpperCase().slice(0, 12))); await run(s.options[i].steps, self); break; }
        case 'if_var': { const v = st.vars.get(s.var) || 0, n = +s.value || 0; const ok = { '==': v === n, '!=': v !== n, '<': v < n, '>': v > n, '<=': v <= n, '>=': v >= n }[s.cmp || '==']; await run(ok ? s.then : s.else, self); break; }
        case 'set_var': st.vars.set(s.var, +s.value || 0); break;
        case 'add_var': st.vars.set(s.var, (st.vars.get(s.var) || 0) + (+s.value || 1)); break;
        case 'hide_npc': { const n = s.target === 'self' ? self : st.npcs.find((x) => x.ev.id === s.target); if (n) { n.hidden = true; if (n.ev.hideFlag) st.flags.add(n.ev.hideFlag); } break; }
        case 'show_npc': { const n = st.npcs.find((x) => x.ev.id === s.target); if (n) { n.hidden = false; if (n.ev.hideFlag) st.flags.delete(n.ev.hideFlag); } break; }
        case 'set_flag': st.flags.add(s.flag); break;
        case 'clear_flag': st.flags.delete(s.flag); break;
        case 'give_item': st.bag[s.item] = (st.bag[s.item] || 0) + (+s.qty || 1); await say(`¡Obtuviste ${s.qty > 1 ? s.qty + ' × ' : ''}${s.item}!`); break;
        case 'give_mon': st.party.push(s.mon); await say(`¡Recibiste a ${monName(s.mon)}!`); break;
        case 'trainer': await say(s.intro || '…'); await flash(); await say(`¡${s.name} saca a ${monName(s.mon)} (Nv. ${s.level})!\n(Aquí empieza el combate real en el juego.)`); await say(s.defeat || '…'); break;
        case 'wild': await encounter(s.mon, s.level); break;
        case 'heal': await flash('#ffffff'); await say('Tu equipo se ha recuperado por completo.'); break;
        case 'move': {
          const who = s.who === 'player' ? st.player : self; if (!who) break;
          for (const d of F.parsePath(s.path)) await step(who, d, true);
          break;
        }
        case 'warp': if (s.map) { warpTo(s.map, +s.x, +s.y); await wait(200); } break;
        case 'wait': await wait((+s.frames || 30) * (1000 / 60)); break;
        default: break;
      }
    }
  };
  const flash = (color = '#000000') => new Promise((r) => { st.flash = { color, t: 0, done: r }; });
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const step = (who, dir, force) => new Promise((resolve) => {
    who.facing = dir; const [dx, dy] = D[dir], nx = who.x + dx, ny = who.y + dy, m = st.map;
    const blocked = !passable(m, nx, ny, who.ev) || (who !== st.player && st.player.x === nx && st.player.y === ny) || st.npcs.some((n) => n !== who && !n.hidden && n.x === nx && n.y === ny);
    if (blocked) { setTimeout(resolve, force ? 120 : 0); return; }
    who.stepN = (who.stepN || 0) + 1; who.moving = { fx: who.x, fy: who.y, t: 0, resolve }; who.x = nx; who.y = ny;
  });
  const warpTo = (mapId, x, y) => {
    const m = F.find('maps', mapId); if (!m) return;
    st.map = m; st.player.x = F.clamp(x, 0, m.w - 1); st.player.y = F.clamp(y, 0, m.h - 1); st.player.moving = null; st.npcs = makeNpcs(m); st.taken = st.taken || new Set();
    st.fade = 1; enterMap();
  };
  const makeNpcs = (m) => m.events.filter((e) => e.type === 'npc').map((e) => ({ ev: e, x: e.x, y: e.y, facing: e.facing || 'down', sprite: F.find('sprites', e.sprite), moving: null, timer: Math.random() * 120, hidden: !!(e.hideFlag && st && st.flags.has(e.hideFlag)) }));
  /* Evento de nivel: se ejecuta al entrar al mapa. */
  const enterMap = async () => { const sc = F.find('scripts', st.map.onEnter); if (!sc) return; st.busy = true; await wait(350); await run(sc.steps, null); if (st) st.busy = false; };
  /* Al terminar un paso: puertas, gatillos y hierba alta. */
  const afterStep = async () => {
    if (!st) return; const p = st.player, m = st.map;
    const w = m.events.find((e) => e.type === 'warp' && e.x === p.x && e.y === p.y);
    if (w && w.toMap) return warpTo(w.toMap, w.toX, w.toY);
    const trig = m.events.find((e) => e.type === 'trigger' && e.x === p.x && e.y === p.y && (st.vars.get(e.var) || 0) === (+e.value || 0));
    if (trig) { const sc = F.find('scripts', trig.script); if (sc) { st.busy = true; await run(sc.steps, null); if (st) st.busy = false; } return; }
    const ts = F.find('sprites', m.tileset), tile = m.bottom[p.y * m.w + p.x];
    if (ts && (ts.behav || {})[tile] === 'grass' && m.wild && m.wild.list.length && Math.random() < (m.wild.rate || 20) / 180) {
      let r = Math.random() * m.wild.list.reduce((a, x) => a + (+x.pct || 0), 0), pick = m.wild.list[0];
      for (const x of m.wild.list) { r -= +x.pct || 0; if (r <= 0) { pick = x; break; } }
      const lvl = Math.round(Math.min(pick.min, pick.max) + Math.random() * Math.abs(pick.max - pick.min));
      st.busy = true; await encounter(pick.mon, lvl); if (st) st.busy = false;
    }
  };
  /* Encuentro: destello, fondo de combate con el sprite de frente y mensaje. */
  const encounter = async (monId, level) => {
    await flash(); const mon = F.find('fakemons', monId);
    st.battle = { sprite: mon && F.find('sprites', mon.sprites.front) };
    await say(`¡Un ${monName(monId)} salvaje apareció! (Nv. ${level})`);
    await say('(Combate simulado. El combate real lo hace el motor del juego.)');
    st.battle = null;
  };

  const interact = async () => {
    const p = st.player, [dx, dy] = D[p.facing], tx = p.x + dx, ty = p.y + dy, m = st.map;
    const npc = st.npcs.find((n) => !n.hidden && n.x === tx && n.y === ty);
    const ev = npc ? npc.ev : m.events.find((e) => e.x === tx && e.y === ty && (e.type === 'sign' || e.type === 'item'));
    if (!ev) return;
    if (ev.type === 'item') { if (st.taken.has(ev.id)) return; st.busy = true; st.taken.add(ev.id); st.bag[ev.item] = (st.bag[ev.item] || 0) + 1; await say(`¡Encontraste ${ev.item}!`); st.busy = false; return; }
    if (npc) npc.facing = { up: 'down', down: 'up', left: 'right', right: 'left' }[p.facing];
    const sc = F.find('scripts', ev.script); st.busy = true;
    if (sc) await run(sc.steps, npc); else await say(ev.type === 'sign' ? '(Un cartel sin texto. Asígnale un evento en Mapas.)' : '…');
    if (st) st.busy = false;
  };

  /* ---------- bucle ---------- */
  const keys = new Set();
  const frame = () => {
    if (!st || st.stopped) return; st.raf = requestAnimationFrame(frame);
    const c = st.ctx, m = st.map, p = st.player;
    // lógica
    const advance = (who) => { if (!who.moving) return; who.moving.t += 1 / 16; if (who.moving.t >= 1) { const r = who.moving.resolve; who.moving = null; r && r(); } };
    advance(p); st.npcs.forEach(advance);
    if (!p.moving && !st.dialog && !st.busy && !st.flash) {
      const dir = keys.has('up') ? 'up' : keys.has('down') ? 'down' : keys.has('left') ? 'left' : keys.has('right') ? 'right' : null;
      if (dir) { if (p.facing !== dir && !st.turnHold) { p.facing = dir; st.turnHold = 4; } else if (!st.turnHold || --st.turnHold <= 0) { const ox = p.x, oy = p.y; step(p, dir).then(() => { if (st && (p.x !== ox || p.y !== oy)) afterStep(); }); } }
      else st.turnHold = 0;
    }
    if (!st.dialog && !st.busy) st.npcs.forEach((n) => {
      if (n.moving || n.ev.movement === 'quieto') return; if (--n.timer > 0) return; n.timer = 90 + Math.random() * 120;
      const d = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
      if (n.ev.movement === 'mirar') n.facing = d;
      else if (Math.abs(n.x + D[d][0] - n.ev.x) <= 2 && Math.abs(n.y + D[d][1] - n.ev.y) <= 2) step(n, d);
    });
    st.tick++;
    // cámara
    const pos = (o) => { const t = o.moving ? o.moving.t : 1, fx = o.moving ? o.moving.fx : o.x, fy = o.moving ? o.moving.fy : o.y; return [(fx + (o.x - fx) * t) * T, (fy + (o.y - fy) * t) * T]; };
    const [px, py] = pos(p);
    const camX = Math.round(F.clamp(px + 8 - SW / 2, Math.min(0, (m.w * T - SW) / 2), Math.max(0, m.w * T - SW)));
    const camY = Math.round(F.clamp(py + 8 - SH / 2, Math.min(0, (m.h * T - SH) / 2), Math.max(0, m.h * T - SH)));
    c.fillStyle = '#000'; c.fillRect(0, 0, SW, SH); c.save(); c.translate(-camX, -camY);
    const ts = F.find('sprites', m.tileset), cv = ts && F.tileCanvas(ts); c.imageSmoothingEnabled = false;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) F.drawTile(c, ts, cv, m.bottom[y * m.w + x], x * T, y * T, 1);
    for (const e of m.events) if (e.type === 'item' && !st.taken.has(e.id)) { c.fillStyle = '#e8442a'; c.beginPath(); c.arc(e.x * T + 8, e.y * T + 9, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.fillRect(e.x * T + 3, e.y * T + 8, 10, 2); }
    const actors = [...st.npcs.filter((n) => !n.hidden).map((n) => ({ o: n, s: n.sprite })), { o: p, s: st.pSprite }].map((a) => ({ ...a, xy: pos(a.o) })).sort((a, b) => a.xy[1] - b.xy[1]);
    for (const a of actors) {
      const [ax, ay] = a.xy, o = a.o, s = a.s;
      if (!s) { c.fillStyle = o === p ? '#ffb547' : '#7cc6ff'; c.fillRect(ax + 3, ay + 1, 10, 14); continue; }
      const walking = o.moving && s.frames.length >= 9, seq = F.WALK[o.facing];
      const fi = walking ? seq[(o.stepN % 2) * 2 + (o.moving.t < 0.5 ? 0 : 1)] : F.WALK.stand[o.facing];
      F.drawFrame(c, s, Math.min(fi, s.frames.length - 1), Math.round(ax + (T - s.w) / 2), Math.round(ay + T - s.h), 1, o.facing === 'right');
    }
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) F.drawTile(c, ts, cv, m.top[y * m.w + x], x * T, y * T, 1);
    c.restore();
    if (st.fade > 0) { c.fillStyle = `rgba(0,0,0,${st.fade})`; c.fillRect(0, 0, SW, SH); st.fade = Math.max(0, st.fade - 0.06); }
    if (st.flash) { st.flash.t += 1; const a = Math.abs(Math.sin(st.flash.t / 6)); c.fillStyle = st.flash.color; c.globalAlpha = a; c.fillRect(0, 0, SW, SH); c.globalAlpha = 1; if (st.flash.t > 36) { const d = st.flash.done; st.flash = null; d(); } }
    if (st.battle) {
      const g = c.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#f8f4e0'); g.addColorStop(1, '#bcd9a4'); c.fillStyle = g; c.fillRect(0, 0, SW, SH);
      c.fillStyle = '#a8c98c'; c.beginPath(); c.ellipse(176, 74, 50, 12, 0, 0, Math.PI * 2); c.fill();
      if (st.battle.sprite) F.drawFrame(c, st.battle.sprite, st.tick % 40 < 20 || st.battle.sprite.frames.length < 2 ? 0 : 1, 144, 80 - st.battle.sprite.h, 1);
    }
    // diálogo
    const dlg = st.dialog;
    if (dlg) {
      c.font = '10px "Silkscreen", monospace'; if (!dlg.pages) dlg.pages = pages(c, dlg.text);
      c.fillStyle = '#f8f8f8'; c.fillRect(4, SH - 44, SW - 8, 40); c.strokeStyle = '#4060a8'; c.lineWidth = 2; c.strokeRect(5, SH - 43, SW - 10, 38); c.strokeStyle = '#a8c0f0'; c.strokeRect(8, SH - 40, SW - 16, 32);
      const pg = dlg.pages[dlg.page], full = pg.join('\n'); dlg.chars = Math.min(full.length, dlg.chars + 1.5);
      const shown = full.slice(0, Math.floor(dlg.chars)).split('\n');
      c.fillStyle = '#303030'; c.textBaseline = 'top'; shown.forEach((ln, i) => c.fillText(ln, 14, SH - 36 + i * 14));
      if (dlg.chars >= full.length && dlg.page < dlg.pages.length - 1 && st.tick % 30 < 18) { c.fillStyle = '#e8442a'; c.beginPath(); c.moveTo(SW - 18, SH - 14); c.lineTo(SW - 12, SH - 14); c.lineTo(SW - 15, SH - 10); c.fill(); }
      if (dlg.menu && dlg.page === dlg.pages.length - 1 && dlg.chars >= full.length) {
        const mw = Math.max(54, 28 + Math.max(...dlg.menu.map((o) => c.measureText(o).width))), mh = 10 + dlg.menu.length * 16;
        const mx = SW - mw - 6, my = SH - 48 - mh;
        c.fillStyle = '#f8f8f8'; c.fillRect(mx, my, mw, mh); c.strokeStyle = '#4060a8'; c.strokeRect(mx + 1, my + 1, mw - 2, mh - 2);
        c.fillStyle = '#303030'; dlg.menu.forEach((o, i) => c.fillText(o, mx + 20, my + 7 + i * 16)); c.fillText('▶', mx + 6, my + 7 + dlg.choice * 16);
      }
    }
    // indicador de inventario
    $('#play-bag') && ($('#play-bag').textContent = Object.entries(st.bag).map(([k, v]) => `${k} ×${v}`).join(' · ') || 'Mochila vacía');
  };
  const press = (k) => {
    if (!st) return; const dlg = st.dialog;
    if (k === 'a') {
      if (dlg) {
        const full = dlg.pages ? dlg.pages[dlg.page].join('\n') : '';
        if (dlg.chars < full.length) { dlg.chars = full.length; return; }
        if (dlg.page < dlg.pages.length - 1) { dlg.page++; dlg.chars = 0; return; }
        st.dialog = null; dlg.resolve(dlg.menu ? dlg.choice : true); return;
      }
      if (!st.busy && !st.player.moving) interact();
    }
    if (k === 'b' && dlg && dlg.menu) { st.dialog = null; dlg.resolve(dlg.menu.length - 1); }
    if (dlg && dlg.menu && (k === 'up' || k === 'down')) dlg.choice = (dlg.choice + (k === 'up' ? -1 : 1) + dlg.menu.length) % dlg.menu.length;
  };
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', z: 'a', Enter: 'a', ' ': 'a', x: 'b', Backspace: 'b', Escape: 'b' };
  document.addEventListener('keydown', (e) => { if (!st || F.state.view !== 'probar' || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (!k) return; e.preventDefault(); if (['up', 'down', 'left', 'right'].includes(k)) { keys.add(k); if (st.dialog) press(k); } else if (!e.repeat) press(k); });
  document.addEventListener('keyup', (e) => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (k) keys.delete(k); });

  const stop = () => { if (st) { st.stopped = true; cancelAnimationFrame(st.raf); } st = null; keys.clear(); };
  P.stop = stop;

  const pad = () => {
    const hold = (k) => ({ onpointerdown: (e) => { e.preventDefault(); keys.add(k); if (st && st.dialog) press(k); }, onpointerup: () => keys.delete(k), onpointerleave: () => keys.delete(k), onpointercancel: () => keys.delete(k) });
    return h('div', { class: 'gamepad' },
      h('div', { class: 'dpad' }, h('button', { class: 'up', 'aria-label': 'Arriba', ...hold('up') }, '▲'), h('button', { class: 'left', 'aria-label': 'Izquierda', ...hold('left') }, '◀'), h('button', { class: 'right', 'aria-label': 'Derecha', ...hold('right') }, '▶'), h('button', { class: 'down', 'aria-label': 'Abajo', ...hold('down') }, '▼')),
      h('div', { class: 'ab' }, h('button', { class: 'b', onclick: () => press('b') }, 'B'), h('button', { class: 'a', onclick: () => press('a') }, 'A')));
  };

  const boot = (m) => {
    stop();
    const cv = $('#play-canvas'); if (!cv || !m) return;
    const start = m.events.find((e) => e.type === 'start');
    let sx = start ? start.x : Math.floor(m.w / 2), sy = start ? start.y : Math.floor(m.h / 2);
    if (!start && !passable(m, sx, sy)) { outer: for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (passable(m, x, y)) { sx = x; sy = y; break outer; } }
    st = { ctx: cv.getContext('2d'), map: m, player: { x: sx, y: sy, facing: 'down', moving: null }, pSprite: playerSprite(), npcs: makeNpcs(m), flags: new Set(), vars: new Map(), bag: {}, party: [], taken: new Set(), tick: 0, fade: 1 };
    st.npcs = makeNpcs(m);
    st.raf = requestAnimationFrame(frame);
    cv.focus(); enterMap();
  };

  P.render = () => {
    if (F.state.view !== 'probar') return stop();
    const p = F.state.project, root = $('#view');
    if (!F.find('maps', P.mapId)) P.mapId = p.maps[0] ? p.maps[0].id : null;
    if (!P.mapId) { root.replaceChildren(h('section', { class: 'empty solo' }, h('h2', {}, 'No hay mapas para probar'), h('p', {}, 'Crea un mapa en la sección Mapas y vuelve aquí para recorrerlo.'))); return; }
    const owSprites = p.sprites.filter((s) => s.kind.startsWith('overworld'));
    const cv = h('canvas', { id: 'play-canvas', width: SW, height: SH, tabindex: 0, 'aria-label': 'Pantalla de juego de prueba' });
    root.replaceChildren(h('div', { class: 'play' },
      h('div', { class: 'gba' }, h('div', { class: 'screen' }, cv), pad()),
      h('aside', { class: 'play-side' },
        h('section', { class: 'panel' }, h('h3', {}, 'Probar el juego'),
          h('label', { class: 'field' }, h('span', {}, 'Mapa'), h('select', { id: 'play-map', onchange: (e) => { P.mapId = e.target.value; boot(F.find('maps', P.mapId)); } }, ...p.maps.map((m) => h('option', { value: m.id, selected: m.id === P.mapId }, m.name)))),
          h('label', { class: 'field' }, h('span', {}, 'Personaje'), h('select', { id: 'play-sprite', onchange: (e) => { owSprites.forEach((s) => { s.player = s.id === e.target.value; }); if (st) st.pSprite = playerSprite(); F.scheduleAutosave(); } }, ...owSprites.map((s) => h('option', { value: s.id, selected: s === playerSprite() }, s.name)))),
          h('button', { class: 'btn', onclick: () => boot(F.find('maps', P.mapId)) }, 'Reiniciar'),
          h('dl', { class: 'keys' }, h('dt', {}, 'Flechas / WASD'), h('dd', {}, 'Caminar'), h('dt', {}, 'Z / Enter / Espacio'), h('dd', {}, 'Hablar, avanzar texto (A)'), h('dt', {}, 'X / Esc'), h('dd', {}, 'Cancelar (B)'))),
        h('section', { class: 'panel' }, h('h3', {}, 'Mochila de prueba'), h('p', { id: 'play-bag', class: 'small' }, 'Mochila vacía'), h('p', { class: 'hint' }, 'Los combates se simulan con mensajes. El combate real lo hace el motor del juego al exportar.')))));
    boot(F.find('maps', P.mapId));
  };
  P.start = (mapId) => { P.mapId = mapId; F.go('probar'); };

  /* Prueba de un evento suelto en una ventana de diálogo. */
  P.runStandalone = async (script) => {
    const cv = h('canvas', { width: SW, height: SH, class: 'standalone', tabindex: 0 });
    const back = h('div', { class: 'modal-back' }), box = h('div', { class: 'modal play-modal' }, h('h3', {}, 'Probando: ' + script.name), h('div', { class: 'screen' }, cv), h('p', { class: 'hint' }, 'Z / Enter / clic = A · ↑↓ elegir · X = B'), h('div', { class: 'modal-actions' }, h('button', { class: 'btn', onclick: () => close() }, 'Cerrar')));
    back.append(box); document.body.append(back);
    const prevView = F.state.view; F.state.view = 'probar';
    const m = { w: 15, h: 10, bottom: new Array(150).fill(-1), top: new Array(150).fill(-1), coll: new Array(150).fill(0), events: [], tileset: '' };
    stop(); st = { ctx: cv.getContext('2d'), map: m, player: { x: 7, y: 6, facing: 'up' }, pSprite: playerSprite(), npcs: [], flags: new Set(), vars: new Map(), bag: {}, party: [], taken: new Set(), tick: 0, fade: 0 };
    st.raf = requestAnimationFrame(frame); cv.focus();
    cv.addEventListener('click', () => press('a'));
    const close = () => { stop(); back.remove(); F.state.view = prevView; };
    await run(script.steps, null); if (st) await say('(Fin del evento)'); close();
  };
})();
