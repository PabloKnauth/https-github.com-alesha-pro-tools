/* Forja GBA — referencia de estadísticas de los Pokémon oficiales para diseñar Fakemon equilibrados. */
'use strict';
(() => {
  const F = window.F, { h } = F;
  const K = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  let cache = null;
  /** Lista de referencia con total (BST) calculado. */
  F.refList = () => {
    if (cache) return cache;
    cache = (F.POKEDEX || []).map((e, i) => ({
      i, num: e[0], name: e[1], form: e[2], types: e[3], st: e[4], abilities: e[5], hidden: e[6], gen: e[7], height: e[8], weight: e[9],
      catchRate: e[10], exp: e[11], female: e[12], growth: e[13], eggs: e[14], legend: e[15], from: e[16], bst: e[4].reduce((a, b) => a + b, 0),
      label: e[1] + (e[2] ? ` (${e[2]})` : ''),
    }));
    return cache;
  };
  const monStats = (mon) => K.map((k) => +mon.stats[k] || 0);
  /** Parecido de reparto de estadísticas (0 = idéntico) con un pequeño peso por el total y los tipos. */
  const distance = (a, aTypes, r) => {
    const sa = a.reduce((x, y) => x + y, 0) || 1; let d = 0;
    for (let i = 0; i < 6; i++) d += (a[i] / sa - r.st[i] / r.bst) ** 2;
    d = Math.sqrt(d) * 10 + Math.abs(sa - r.bst) / 120;
    const shared = r.types.filter((t) => t && aTypes.includes(t)).length;
    return d - shared * 0.35;
  };
  F.refSimilar = (mon, n = 5) => { const a = monStats(mon), t = mon.types.filter(Boolean); return F.refList().map((r) => [distance(a, t, r), r]).sort((x, y) => x[0] - y[0]).slice(0, n).map((x) => x[1]); };
  /** Percentil del total frente a todos los Pokémon finales (no legendarios incluidos). */
  F.refPercentile = (bst) => { const l = F.refList().filter((r) => !r.form); return Math.round((l.filter((r) => r.bst < bst).length / l.length) * 100); };

  const typeChip = (id) => { const t = F.typeInfo(id); return t ? h('span', { class: 'type-chip sm', style: { '--t': t[2] } }, t[1]) : null; };
  const statBars = (st) => h('span', { class: 'mini-bars', 'aria-hidden': 'true' }, ...st.map((v, i) => h('i', { style: { height: Math.max(2, Math.round((v / 255) * 22)) + 'px', background: F.STATS[i][2] } })));

  /* radar comparando el Fakemon (relleno) con el Pokémon de referencia (línea punteada) */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888';
  const compareRadar = (a, b) => {
    const cv = h('canvas', { width: 260, height: 220, class: 'radar', 'aria-label': 'Comparación de estadísticas' }), c = cv.getContext('2d');
    const cx = 130, cy = 114, R = 84, pt = (i, r) => { const ang = -Math.PI / 2 + (i * Math.PI * 2) / 6; return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]; };
    c.strokeStyle = css('--line'); for (const f of [0.25, 0.5, 0.75, 1]) { c.beginPath(); for (let i = 0; i <= 6; i++) { const [x, y] = pt(i % 6, R * f); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    const poly = (st, fill, stroke, dash) => { c.beginPath(); st.forEach((v, i) => { const [x, y] = pt(i, R * Math.min(1, v / 180)); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } c.setLineDash(dash || []); c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); c.setLineDash([]); };
    poly(a, css('--accent-soft'), css('--accent')); poly(b, null, css('--fg'), [4, 3]);
    c.font = '600 11px ' + css('--font-ui'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = css('--muted');
    F.STATS.forEach(([, label], i) => { const [x, y] = pt(i, R + 16); c.fillText(label, x, y); });
    return cv;
  };

  /** Ventana para buscar entre los 1025 Pokémon y usarlos como referencia. */
  F.refDialog = async (mon, onApply) => {
    const list = F.refList(); let q = '', type = '', gen = '', sort = 'num', pick = F.refSimilar(mon, 1)[0] || list[0], kind = '';
    const rowsBox = h('div', { class: 'ref-rows', role: 'listbox', 'aria-label': 'Pokémon de referencia' }), detail = h('div', { class: 'ref-detail' }), count = h('small', { class: 'muted' });
    const filtered = () => {
      const qq = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      let l = list.filter((r) => (!qq || r.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(qq) || String(r.num) === qq) && (!type || r.types.includes(type)) && (!gen || r.gen === +gen)
        && (!kind || (kind === 'legend' ? r.legend : kind === 'forms' ? r.form : kind === 'base' ? !r.from && !r.form : kind === 'final' ? !r.form && !list.some((x) => x.from === r.num) : true)));
      if (sort === 'bst') l = l.slice().sort((a, b) => b.bst - a.bst);
      else if (sort.startsWith('s')) { const k = +sort.slice(1); l = l.slice().sort((a, b) => b.st[k] - a.st[k]); }
      else if (sort === 'sim') { const a = monStats(mon), t = mon.types.filter(Boolean); l = l.map((r) => [distance(a, t, r), r]).sort((x, y) => x[0] - y[0]).map((x) => x[1]); }
      return l;
    };
    const renderRows = () => {
      const l = filtered(); count.textContent = `${l.length} de ${list.length}`;
      rowsBox.replaceChildren(...l.slice(0, 300).map((r) => h('button', { class: 'ref-row' + (r === pick ? ' sel' : ''), role: 'option', 'aria-selected': r === pick ? 'true' : 'false', onclick: () => { pick = r; renderRows(); renderDetail(); } },
        h('span', { class: 'mono num' }, '#' + String(r.num).padStart(4, '0')), h('span', { class: 'ref-name' }, r.label), h('span', { class: 'chips' }, ...r.types.filter(Boolean).map(typeChip)), statBars(r.st), h('b', { class: 'mono' }, r.bst))),
        ...(l.length > 300 ? [h('p', { class: 'hint' }, `Mostrando 300 de ${l.length}. Escribe un nombre o usa los filtros.`)] : []));
    };
    const renderDetail = () => {
      const r = pick, a = monStats(mon), bstA = a.reduce((x, y) => x + y, 0);
      detail.replaceChildren(
        h('div', { class: 'ref-head' }, h('b', {}, `#${r.num} ${r.label}`), h('span', { class: 'chips' }, ...r.types.filter(Boolean).map(typeChip)), h('small', { class: 'muted' }, `Generación ${r.gen}${r.legend === 1 ? ' · legendario' : r.legend === 2 ? ' · singular' : ''}`)),
        compareRadar(a, r.st), h('small', { class: 'muted center' }, `Relleno: ${mon.name}. Línea punteada: ${r.label}.`),
        h('table', { class: 'ref-table' }, h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, r.name), h('th', {}, mon.name), h('th', {}, 'Dif.'))),
          h('tbody', {}, ...F.STATS.map(([, label], i) => h('tr', {}, h('td', {}, label), h('td', { class: 'mono' }, r.st[i]), h('td', { class: 'mono' }, a[i]), h('td', { class: 'mono ' + (a[i] - r.st[i] > 0 ? 'up' : a[i] - r.st[i] < 0 ? 'down' : '') }, (a[i] - r.st[i] > 0 ? '+' : '') + (a[i] - r.st[i])))),
            h('tr', { class: 'total' }, h('td', {}, 'Total'), h('td', { class: 'mono' }, r.bst), h('td', { class: 'mono' }, bstA), h('td', { class: 'mono' }, (bstA - r.bst > 0 ? '+' : '') + (bstA - r.bst))))),
        h('dl', { class: 'ref-facts' }, h('dt', {}, 'Habilidades'), h('dd', {}, [...r.abilities, r.hidden ? r.hidden + ' (oculta)' : ''].filter(Boolean).join(', ') || '—'),
          h('dt', {}, 'Captura'), h('dd', {}, r.catchRate), h('dt', {}, 'Crecimiento'), h('dd', {}, (F.GROWTH.find((g) => g[0] === r.growth) || [])[1] || r.growth),
          h('dt', {}, 'Altura / peso'), h('dd', {}, `${r.height} m · ${r.weight} kg`), h('dt', {}, 'Género'), h('dd', {}, r.female < 0 ? 'Sin género' : `${r.female}% hembras`)),
        h('div', { class: 'btn-col' },
          h('button', { class: 'btn primary', onclick: () => apply('stats') }, 'Copiar sus estadísticas'),
          h('button', { class: 'btn', onclick: () => apply('scale') }, `Mismo reparto con mi total (${bstA})`),
          h('button', { class: 'btn', onclick: () => apply('all') }, 'Copiar todo (tipos, habilidades, crianza…)')));
    };
    const apply = (what) => {
      const r = pick;
      if (what === 'stats' || what === 'all') K.forEach((k, i) => (mon.stats[k] = r.st[i]));
      if (what === 'scale') { const tot = K.reduce((a, k) => a + (+mon.stats[k] || 0), 0); K.forEach((k, i) => (mon.stats[k] = F.clamp(Math.round((r.st[i] / r.bst) * tot), 1, 255))); }
      if (what === 'all') {
        mon.types = [r.types[0], r.types[1] || '']; mon.catchRate = r.catchRate; mon.expYield = r.exp || mon.expYield; mon.growth = r.growth;
        mon.genderFemale = r.female; mon.eggGroups = [r.eggs[0] || 'FIELD', r.eggs[1] || '']; mon.height = r.height; mon.weight = r.weight;
        mon.abilities = [r.abilities[0] || '', r.abilities[1] || '']; mon.hidden = r.hidden || '';
      }
      F.scheduleAutosave(); onApply && onApply(); renderDetail(); F.toast(what === 'all' ? `Datos de ${r.label} copiados. Cambia el nombre y la descripción.` : `Estadísticas basadas en ${r.label}.`);
    };
    const search = h('input', { id: 'ref-q', type: 'search', placeholder: 'Buscar por nombre o número…', oninput: (e) => { q = e.target.value; renderRows(); } });
    const sel = (id, opts, onch) => h('select', { id, onchange: (e) => { onch(e.target.value); renderRows(); } }, ...opts.map(([v, l]) => h('option', { value: v }, l)));
    const body = h('div', { class: 'ref-layout' },
      h('div', { class: 'stack' }, search,
        h('div', { class: 'row tight' },
          sel('ref-type', [['', 'Todos los tipos'], ...F.TYPES.map((t) => [t[0], t[1]])], (v) => (type = v)),
          sel('ref-gen', [['', 'Todas las generaciones'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => [g, 'Generación ' + g])], (v) => (gen = v)),
          sel('ref-kind', [['', 'Todos'], ['base', 'Primeras etapas'], ['final', 'Etapas finales'], ['legend', 'Legendarios y singulares'], ['forms', 'Formas (Mega, Alola…)']], (v) => (kind = v)),
          sel('ref-sort', [['num', 'Orden de Pokédex'], ['sim', 'Más parecidos a mi Fakemon'], ['bst', 'Mayor total'], ...F.STATS.map(([, l], i) => ['s' + i, 'Mayor ' + l])], (v) => (sort = v))),
        count, rowsBox),
      detail);
    renderRows(); renderDetail();
    await F.dialog({ title: 'Referencia: los 1025 Pokémon oficiales', body, actions: [{ label: 'Cerrar', value: true, primary: true }] });
  };

  /** Tarjeta para el laboratorio: parecidos y percentil del total. */
  F.refCard = (mon, rerender) => {
    const bst = monStats(mon).reduce((a, b) => a + b, 0), sim = F.refSimilar(mon, 5);
    return h('section', { class: 'card' }, h('h3', {}, 'Referencia oficial'),
      h('p', {}, `Tu total de ${bst} supera al ${F.refPercentile(bst)}% de los Pokémon.`),
      h('div', { class: 'ref-mini' }, ...sim.map((r) => h('div', { class: 'ref-mini-row' }, h('span', { class: 'ref-name' }, r.label), h('span', { class: 'chips' }, ...r.types.filter(Boolean).map(typeChip)), statBars(r.st), h('b', { class: 'mono' }, r.bst)))),
      h('small', { class: 'muted' }, 'Los más parecidos en reparto de estadísticas y tipo.'),
      h('button', { class: 'btn', onclick: () => F.refDialog(mon, rerender) }, 'Buscar entre los 1025 Pokémon'));
  };
})();
