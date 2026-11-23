/* Forja GBA — aplicación: navegación, inicio, proyecto y arranque. */
'use strict';
(() => {
  const F = window.F, { h, $ } = F;
  const VIEWS = [
    ['inicio', 'Inicio'], ['pixel', 'Pixel'], ['fakemon', 'Fakemon'], ['mapas', 'Mapas'], ['eventos', 'Eventos'], ['probar', 'Probar'], ['exportar', 'Exportar'],
  ];
  const renderers = () => ({ inicio: renderHome, pixel: F.pixel.render, fakemon: F.fakemon.render, mapas: F.map.render, eventos: F.events.render, probar: F.play.render, exportar: F.exporter.render });

  F.go = (view) => {
    if (!renderers()[view]) view = 'inicio';
    if (F.state.view === 'probar' && view !== 'probar') F.play.stop();
    F.state.view = view;
    F.$$('#nav a').forEach((a) => a.setAttribute('aria-current', a.dataset.view === view ? 'page' : 'false'));
    if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    $('#view').dataset.view = view;
    renderers()[view]();
    $('#view').focus({ preventScroll: true });
  };
  const rerender = () => renderers()[F.state.view]();

  const setProject = (p, msg) => {
    F.state.project = p; F.pixel.spriteId = null; F.pixel.undo = []; F.pixel.redo = []; F.fakemon.id = null; F.map.id = null; F.events.id = null;
    $('#proj-name').value = p.name; F.autosave(); rerender(); if (msg) F.toast(msg);
  };
  const loadSample = () => setProject(F.deserialize(F.SAMPLE), 'Proyecto de ejemplo cargado');
  const openFile = async (file) => {
    try { setProject(F.deserialize(await file.text()), 'Proyecto abierto: ' + file.name); }
    catch (e) { F.toast(e.message || 'No se pudo abrir el archivo.', 'error'); }
  };
  F.saveProject = () => { F.state.dirty = false; F.download(F.fileName(F.state.project.name) + '.forja.json', F.serialize()); };

  /* ---------- inicio ---------- */
  function renderHome() {
    const p = F.state.project, root = $('#view');
    const steps = [
      ['pixel', 'Dibuja', `${p.sprites.length} sprites`, 'Personajes, Fakemon y bloques con la paleta real de 16 colores de la GBA. Importa tus PNG y se ajustan solos.'],
      ['fakemon', 'Crea Fakemon', `${p.fakemons.length} criaturas`, 'Tipos, estadísticas con guía de balance, habilidades, movimientos y evolución.'],
      ['mapas', 'Arma mapas', `${p.maps.length} mapas`, 'Suelo, capa de encima, colisiones y eventos: personajes, carteles, objetos y puertas.'],
      ['eventos', 'Programa eventos', `${p.scripts.length} eventos`, 'Diálogos, elecciones, banderas, contadores, regalos y combates con bloques. Genera XSE, Poryscript y comandos de Essentials.'],
      ['probar', 'Pruébalo', 'en el navegador', 'Camina por tu mapa en una pantalla de 240×160 y habla con los personajes.'],
      ['exportar', 'Exporta', 'ROM, decomp o Essentials', 'Scripts de XSE y guía para Advance Map, proyecto decomp o archivos de Essentials, con un LEEME paso a paso.'],
    ];
    const fileIn = h('input', { type: 'file', accept: 'image/*,.json', multiple: true, hidden: true, id: 'home-files', onchange: async (e) => { for (const f of e.target.files) await handleFile(f); e.target.value = ''; } });
    root.replaceChildren(h('div', { class: 'home' },
      h('section', { class: 'hero' },
        h('div', { class: 'hero-text' },
          h('p', { class: 'eyebrow' }, 'Estudio para hacks de GBA'),
          h('h1', {}, 'Forja tu propio juego de criaturas'),
          h('p', { class: 'lead' }, 'Dibuja, diseña Fakemon, arma mapas y programa eventos sin escribir código. Todo respeta los límites reales de la Game Boy Advance, así que lo que hagas aquí funciona en el juego.'),
          h('div', { class: 'btn-row' },
            h('button', { class: 'btn primary lg', onclick: () => F.go('pixel') }, 'Empezar a dibujar'),
            h('button', { class: 'btn lg', onclick: () => F.play.start(p.maps[0] && p.maps[0].id) }, 'Probar el ejemplo'))),
        h('figure', { class: 'hero-art' }, heroArt(), h('figcaption', {}, 'Brasín, el Fakemon de ejemplo, hecho con esta herramienta.'))),
      h('ol', { class: 'flow' }, ...steps.map(([v, t, count, txt], i) => h('li', {}, h('a', { href: '#' + v, onclick: (e) => { e.preventDefault(); F.go(v); } },
        h('span', { class: 'step-n' }, i + 1), h('b', {}, t), h('small', { class: 'count-tag' }, count), h('span', {}, txt))))),
      h('div', { class: 'home-grid' },
        h('section', { class: 'card drop', id: 'dropzone', onclick: () => fileIn.click(), tabindex: 0, role: 'button', onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') fileIn.click(); } },
          h('h3', {}, 'Trae tus imágenes'), h('p', {}, 'Arrastra aquí PNG de personajes, Pokémon o tilesets (también hojas 4×4 de RPG Maker/Essentials). Detecto si están ampliadas, las reduzco a 15 colores y las acomodo al formato GBA.'), h('span', { class: 'btn' }, 'Elegir archivos'), fileIn),
        h('section', { class: 'card' }, h('h3', {}, 'La GBA en 30 segundos'),
          h('dl', { class: 'facts' },
            h('dt', {}, '240 × 160'), h('dd', {}, 'Píxeles de pantalla: caben 15 × 10 bloques del mapa.'),
            h('dt', {}, '16 colores'), h('dd', {}, 'Por sprite o bloque. El primero siempre es transparente.'),
            h('dt', {}, '15 bits'), h('dd', {}, 'Cada canal tiene 32 niveles; Forja ajusta tus colores solo.'),
            h('dt', {}, '64 × 64'), h('dd', {}, 'Sprite de combate de un Fakemon. Personajes del mapa: 32 × 32.'),
            h('dt', {}, '16 × 16'), h('dd', {}, 'Tamaño de cada bloque (metatile) del mapa.'))),
        h('section', { class: 'card' }, h('h3', {}, 'Proyecto'),
          h('p', {}, 'Se guarda solo en este navegador mientras trabajas. Para no perderlo, descárgalo como archivo .forja.json.'),
          h('div', { class: 'btn-col' },
            h('button', { class: 'btn primary', onclick: F.saveProject }, 'Guardar proyecto en un archivo'),
            h('button', { class: 'btn', onclick: () => fileIn.click() }, 'Abrir un proyecto (.forja.json)'),
            h('button', { class: 'btn', onclick: async () => { if (await F.confirm('Cargar el ejemplo', 'Se reemplaza el proyecto actual por Pueblo Brisa. Guarda antes si quieres conservarlo.', 'Cargar ejemplo')) loadSample(); } }, 'Volver a cargar el ejemplo'),
            h('button', { class: 'btn danger', onclick: async () => { if (await F.confirm('Proyecto vacío', 'Se borra todo lo del proyecto actual. Guarda antes si quieres conservarlo.', 'Empezar de cero')) setProject(F.blankProject(), 'Proyecto nuevo'); } }, 'Empezar un proyecto vacío'))))));
  }
  const heroArt = () => {
    const p = F.state.project, front = p.sprites.find((s) => s.kind === 'front'), cv = h('canvas', { width: 256, height: 256, class: 'hero-canvas', 'aria-hidden': 'true' });
    if (front) {
      const c = cv.getContext('2d'); let i = 0;
      const tick = () => { if (!document.body.contains(cv)) return; c.clearRect(0, 0, 256, 256); F.drawFrame(c, front, i++ % 2 && front.frames.length > 1 ? 1 : 0, 0, 0, 4); setTimeout(tick, 420); };
      requestAnimationFrame(tick);
    }
    return cv;
  };

  /* ---------- archivos ---------- */
  const handleFile = async (f) => {
    if (/\.json$/i.test(f.name)) return openFile(f);
    if (/^image\//.test(f.type) || /\.(png|gif|jpe?g|bmp|webp)$/i.test(f.name)) { const s = await F.importFlow(f); if (s && F.state.view === 'pixel') F.pixel.render(); else if (s) rerender(); return; }
    F.toast('Formato no reconocido: ' + f.name, 'error');
  };
  document.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); document.body.classList.add('dragging'); } });
  document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
  document.addEventListener('drop', async (e) => { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); document.body.classList.remove('dragging'); for (const f of e.dataTransfer.files) await handleFile(f); });
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); F.saveProject(); } });

  /* ---------- arranque ---------- */
  const boot = async () => {
    const nav = $('#nav');
    nav.replaceChildren(...VIEWS.map(([v, l]) => h('a', { href: '#' + v, 'data-view': v, onclick: (e) => { e.preventDefault(); F.go(v); } }, l)));
    $('#proj-name').addEventListener('change', (e) => { F.state.project.name = e.target.value.trim() || 'Mi Hack'; F.scheduleAutosave(); });
    $('#btn-save').addEventListener('click', F.saveProject);
    $('#btn-open').addEventListener('click', () => $('#open-file').click());
    $('#open-file').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) openFile(f); });
    $('#btn-export').addEventListener('click', () => F.go('exportar'));
    F.state.project = F.loadAutosave() || F.deserialize(F.SAMPLE);
    $('#proj-name').value = F.state.project.name;
    F.go((location.hash || '#inicio').slice(1));
    window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v !== F.state.view) F.go(v); });
    F.initDownloads();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
