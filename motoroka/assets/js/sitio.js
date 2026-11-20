/* Moto Roka Fix & Shop — comportamiento del sitio. Sin dependencias.
   Todo respeta prefers-reduced-motion: sin script o con movimiento reducido la página se lee completa. */
(() => {
  const doc = document.documentElement;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const fino = matchMedia('(hover: hover) and (pointer: fine)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const icono = (btn, pausa, txtPausa, txtSeguir) => {
    btn.setAttribute('aria-pressed', String(pausa));
    btn.querySelector('use').setAttribute('href', pausa ? '#play' : '#pausa');
    const t = btn.querySelector('span');
    if (t) t.textContent = pausa ? txtSeguir : txtPausa;
  };

  /* ---------- portada: entrada única (en cuanto hay fuente, sin esperar a las imágenes) ---------- */
  let arrancado = false;
  const arrancar = () => { if (arrancado) return; arrancado = true; requestAnimationFrame(() => doc.classList.add('listo')); };
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 300))]).then(arrancar);

  const video = $('[data-portada]');
  const btnPausa = $('[data-pausa-video]');
  let pausadoPorUsuario = false;
  if (video && matchMedia('(max-width: 760px)').matches) video.poster = 'assets/img/portada-movil-poster.webp';
  if (video && btnPausa) {
    if (quieto.matches) { pausadoPorUsuario = true; icono(btnPausa, true, 'Pausar video', 'Reproducir video'); }
    else video.play().catch(() => icono(btnPausa, true, 'Pausar video', 'Reproducir video'));
    btnPausa.addEventListener('click', () => {
      if (video.paused) { pausadoPorUsuario = false; video.play(); icono(btnPausa, false, 'Pausar video', 'Reproducir video'); }
      else { pausadoPorUsuario = true; video.pause(); icono(btnPausa, true, 'Pausar video', 'Reproducir video'); }
    });
    new IntersectionObserver(([e]) => {
      if (pausadoPorUsuario) return;
      if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
    }).observe(video);
  }

  /* ---------- cinta de marcas: se puede pausar ---------- */
  const cinta = $('[data-cinta]');
  const btnCinta = $('[data-pausa-cinta]');
  if (cinta && btnCinta) btnCinta.addEventListener('click', () => {
    const pausa = !cinta.classList.contains('pausada');
    cinta.classList.toggle('pausada', pausa);
    icono(btnCinta, pausa, 'Pausar cinta de marcas', 'Reanudar cinta de marcas');
  });

  /* ---------- barra: sólida tras la portada, se esconde al bajar y vuelve al subir ---------- */
  const barra = $('[data-barra]');
  const portada = $('.portada');
  const accion = $('[data-accion]');
  let ultimoY = scrollY;
  const alDesplazar = () => {
    const y = scrollY;
    const tras = portada ? portada.offsetHeight - 80 : 0;
    barra.classList.toggle('es-solida', y > 40);
    if (Math.abs(y - ultimoY) > 6) {
      if (!barra.classList.contains('menu-abierto') && !barra.contains(document.activeElement)) barra.classList.toggle('se-oculta', y > ultimoY && y > tras);
      ultimoY = y;
    }
    if (y < tras) barra.classList.remove('se-oculta');
    if (accion) accion.classList.toggle('visible', y > tras * .7);
  };
  addEventListener('scroll', alDesplazar, { passive: true });
  barra.addEventListener('focusin', () => barra.classList.remove('se-oculta'));
  alDesplazar();
  // la barra de acción se retira cuando el cierre del pie ya muestra el mismo botón
  const cierre = $('.pie__cierre');
  if (accion && cierre) new IntersectionObserver(([e]) => accion.classList.toggle('al-final', e.isIntersecting)).observe(cierre);

  /* ---------- menú del teléfono: el resto de la página queda inerte mientras está abierto ---------- */
  const btnMenu = $('[data-menu-btn]');
  const fuera = $$('main, footer, .accion');
  const ponerInerte = v => fuera.forEach(n => { n.inert = v; });
  const cerrarMenu = () => {
    if (!barra.classList.contains('menu-abierto')) return;
    barra.classList.remove('menu-abierto');
    btnMenu.setAttribute('aria-expanded', 'false');
    btnMenu.querySelector('.sr').textContent = 'Abrir menú';
    document.body.style.overflow = '';
    ponerInerte(false);
  };
  btnMenu.addEventListener('click', () => {
    if (btnMenu.getAttribute('aria-expanded') === 'true') return cerrarMenu();
    barra.classList.add('menu-abierto');
    barra.classList.remove('se-oculta');
    btnMenu.setAttribute('aria-expanded', 'true');
    btnMenu.querySelector('.sr').textContent = 'Cerrar menú';
    document.body.style.overflow = 'hidden';
    ponerInerte(true);
    $('#menu a').focus();
  });
  $$('#menu a').forEach(a => a.addEventListener('click', cerrarMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && barra.classList.contains('menu-abierto')) { cerrarMenu(); btnMenu.focus(); } });
  matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) cerrarMenu(); });

  /* ---------- declaración: las palabras se encienden al avanzar ---------- */
  const texto = $('[data-palabras]');
  if (texto && !quieto.matches) {
    const envolver = (nodo) => {
      [...nodo.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.append(t); return; }
            const s = document.createElement('span'); s.className = 'pal'; s.textContent = t; frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) envolver(n);
      });
    };
    envolver(texto);
    const pals = $$('.pal', texto);
    let pendiente = false;
    const pintar = () => {
      pendiente = false;
      const r = texto.getBoundingClientRect();
      const vh = innerHeight;
      // termina de encenderse cuando el texto aún está completo en pantalla
      const p = clamp((vh * .9 - r.top) / (r.height + vh * .15), 0, 1);
      const n = Math.round(p * pals.length);
      pals.forEach((s, i) => s.classList.toggle('on', i < n));
    };
    addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }, { passive: true });
    pintar();
  }

  /* ---------- listas largas: en el teléfono se muestran las primeras y un botón para ver todas ---------- */
  const recortar = ul => {
    if (!ul) return;
    const n = +ul.dataset.corto || 8;
    [...ul.children].filter(li => !li.hidden).forEach((li, i) => li.classList.toggle('fuera', ul.classList.contains('lista-corta') && i >= n));
    const btn = $(`[data-ver-mas="${ul.matches('[data-lms]') ? 'lms' : 'catalogo'}"]`);
    if (btn) btn.hidden = !ul.classList.contains('lista-corta') || ![...ul.children].some(li => li.classList.contains('fuera'));
  };
  $$('[data-ver-mas]').forEach(btn => btn.addEventListener('click', () => {
    const ul = btn.dataset.verMas === 'lms' ? $('[data-lms]') : $('[data-catalogo]');
    const primeroOculto = [...ul.children].find(li => li.classList.contains('fuera'));
    ul.classList.remove('lista-corta'); [...ul.children].forEach(li => li.classList.remove('fuera'));
    btn.hidden = true;
    primeroOculto?.querySelector('a, button')?.focus({ preventScroll: true });
  }));

  /* ---------- catálogo: marca, tipo y orden (con transición) ---------- */
  const filtros = $('[data-filtros]');
  const lista = $('[data-catalogo]');
  const motos = $$('[data-catalogo] .moto');
  if (filtros && lista) {
    const selTipo = $('[data-tipo]', filtros);
    const selOrden = $('[data-orden]', filtros);
    const resultado = $('[data-resultado]');
    let marca = 'todas';
    motos.forEach((m, i) => { m.style.viewTransitionName = `moto-${i}`; });
    const aplicar = () => {
      const tipo = selTipo.value, orden = selOrden.value;
      let n = 0;
      motos.forEach(m => {
        const ver = (marca === 'todas' || m.dataset.marca === marca) && (!tipo || m.dataset.tipo === tipo);
        m.hidden = !ver; if (ver) n++;
      });
      const orden_ = [...motos].sort((x, y) => orden === 'asc' ? x.dataset.precio - y.dataset.precio
        : orden === 'desc' ? y.dataset.precio - x.dataset.precio : x.dataset.i - y.dataset.i);
      orden_.forEach(m => lista.append(m));
      resultado.textContent = n === 1 ? '1 modelo' : n ? `${n} modelos` : 'Sin modelos con esos filtros';
      $('[data-vacio]').hidden = n > 0;
      recortar(lista);
    };
    const conTransicion = fn => {
      if (!document.startViewTransition || quieto.matches) return fn();
      const t = document.startViewTransition(fn);
      [t.ready, t.finished, t.updateCallbackDone].forEach(p => p.catch(() => {})); // una transición interrumpida no es un error
    };
    filtros.addEventListener('click', e => {
      const b = e.target.closest('button[data-marca]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      marca = b.dataset.marca;
      conTransicion(() => { $$('button[data-marca]', filtros).forEach(x => x.setAttribute('aria-pressed', String(x === b))); aplicar(); });
    });
    [selTipo, selOrden].forEach(sel => sel.addEventListener('change', () => conTransicion(aplicar)));
    $('[data-quitar-filtros]').addEventListener('click', () => {
      marca = 'todas'; selTipo.value = ''; selOrden.value = '';
      $$('button[data-marca]', filtros).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.marca === 'todas')));
      conTransicion(aplicar);
    });
    recortar(lista);
  }

  /* ---------- Liqui Moly: filtro por tipo de producto ---------- */
  const filtrosLm = $('[data-filtros-lm]');
  if (filtrosLm) {
    const prods = $$('[data-lms] .lm');
    recortar($('[data-lms]'));
    prods.forEach((li, i) => { li.style.viewTransitionName = 'lm-' + i; });
    filtrosLm.addEventListener('click', e => {
      const b = e.target.closest('button[data-cat]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      const aplicar = () => {
        $$('button[data-cat]', filtrosLm).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        prods.forEach(li => { li.hidden = !(b.dataset.cat === 'todos' || li.dataset.cat === b.dataset.cat); });
        const n = prods.filter(li => !li.hidden).length;
        $('[data-resultado-lm]').textContent = n === 1 ? '1 producto' : `${n} productos`;
        recortar($('[data-lms]'));
      };
      if (!document.startViewTransition || quieto.matches) return aplicar();
      const tr = document.startViewTransition(aplicar);
      [tr.ready, tr.finished, tr.updateCallbackDone].forEach(pr => pr.catch(() => {}));
    });
  }

  /* ---------- ficha técnica con visor 360 ---------- */
  const dlg = $('[data-ficha-dialogo]');
  if (dlg && motos.length) {
    let datosMotos = null, origenFicha = null;
    const cargar = () => datosMotos || (datosMotos = fetch('datos/motos.json').then(r => r.json()));
    const peso = n => '$' + Number(n).toLocaleString('es-MX');
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const escena = $('[data-giro-escena]', dlg), rango = $('[data-giro-rango]', dlg), giro = $('[data-giro]', dlg), ayuda = $('[data-giro-ayuda]', dlg);
    let frames = [], actual = 0, autogiro = null, textoAyuda = '';
    const mostrar = k => {
      if (!frames.length) return;
      actual = (k + frames.length) % frames.length;
      frames.forEach((im, i) => im.classList.toggle('on', i === actual));
      rango.value = actual;
      rango.setAttribute('aria-valuetext', (giro.classList.contains('es-galeria') ? 'Foto ' : 'Ángulo ') + (actual + 1) + ' de ' + frames.length);
    };
    const pararAuto = () => { clearInterval(autogiro); autogiro = null; };
    const abrir = async (i, boton) => {
      origenFicha = boton;
      let lista_;
      try { ({ motos: lista_ } = await cargar()); } catch { datosMotos = null; window.open('https://wa.me/527226665997', '_blank', 'noopener'); return; }
      const m = lista_[i];
      $('[data-ficha-marca]', dlg).textContent = `${m.marca} · ${m.tipo}`;
      $('[data-ficha-nombre]', dlg).textContent = m.modelo;
      $('[data-ficha-precio]', dlg).innerHTML = m.especial
        ? `<b>${peso(m.especial)}</b><s>${peso(m.precio)}</s><small>Precio especial de noviembre 2026 · precio público ${peso(m.precio)}</small>`
        : `<b>${peso(m.precio)}</b><small>Precio público 2026</small>`;
      $('[data-ficha-wa]', dlg).href = 'https://wa.me/527226665997?text=' + encodeURIComponent(`Hola Moto Roka, me interesa la ${m.marca} ${m.modelo}.`);
      const pdf = $('[data-ficha-pdf]', dlg); pdf.hidden = !m.pdf; if (m.pdf) pdf.href = m.pdf;
      $('[data-ficha-specs]', dlg).innerHTML = m.ficha.map(sec => `<section><h3>${esc(sec.seccion)}</h3><dl>${sec.filas.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></section>`).join('');
      // visor: los ángulos van en orden de giro
      escena.replaceChildren(); pararAuto();
      const n = m.giro || 0;
      const rutas = n ? Array.from({ length: n }, (_, k) => `assets/motos/${m.slug}/${String(k).padStart(2, '0')}.webp`) : [`assets/motos/${m.slug}/portada.webp`];
      frames = rutas.map((src, k) => { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = src; if (k === 0) im.classList.add('on'); escena.append(im); return im; });
      frames[0].alt = `${m.marca} ${m.modelo}`;
      const es360 = m.modo === '360';
      giro.classList.toggle('sin-giro', n < 2);
      giro.classList.toggle('es-galeria', !es360);
      rango.max = Math.max(0, n - 1); rango.value = 0; actual = 0;
      textoAyuda = es360 ? 'Arrastra para girar 360°' : 'Desliza para ver más fotos';
      ayuda.textContent = textoAyuda;
      escena.setAttribute('aria-label', es360 ? `Vista 360 de la ${m.marca} ${m.modelo}; arrastra o usa las flechas para girarla` : `Fotos de la ${m.marca} ${m.modelo}; arrastra o usa las flechas para cambiar de foto`);
      mostrar(0);
      dlg.showModal();
      dlg.querySelector('.ficha__info').scrollTop = 0;
      // un giro de presentación al abrir (no con movimiento reducido)
      if (es360 && n > 2 && !quieto.matches) {
        Promise.all(frames.map(im => im.decode().catch(() => {}))).then(() => {
          if (!dlg.open) return;
          let pasos = 0;
          autogiro = setInterval(() => { mostrar(actual + 1); if (++pasos >= n) pararAuto(); }, 140);
        });
      }
    };
    motos.forEach(li => { const b = $('[data-ficha]', li); b.addEventListener('click', () => abrir(+li.dataset.i, b)); });
    $('[data-ficha-cerrar]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { pararAuto(); origenFicha?.focus(); });
    $('[data-giro-ant]', dlg).addEventListener('click', () => { pararAuto(); mostrar(actual - 1); });
    $('[data-giro-sig]', dlg).addEventListener('click', () => { pararAuto(); mostrar(actual + 1); });
    rango.addEventListener('input', () => { pararAuto(); mostrar(+rango.value); });
    escena.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); pararAuto(); mostrar(actual - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); pararAuto(); mostrar(actual + 1); }
    });
    // arrastrar: cada ~6% del ancho cambia de ángulo; la inercia completa el gesto
    let x0 = null, k0 = 0, vx = 0, tPrev = 0, xPrev = 0;
    escena.addEventListener('pointerdown', e => {
      if (frames.length < 2) return;
      pararAuto(); x0 = xPrev = e.clientX; k0 = actual; tPrev = performance.now(); vx = 0;
      escena.setPointerCapture(e.pointerId);
    });
    escena.addEventListener('pointermove', e => {
      if (x0 === null) return;
      const paso = Math.max(24, escena.clientWidth / (frames.length * 1.6));
      mostrar(k0 - Math.round((e.clientX - x0) / paso));
      const t = performance.now(); vx = (e.clientX - xPrev) / Math.max(1, t - tPrev); xPrev = e.clientX; tPrev = t;
    });
    const soltar = () => {
      if (x0 === null) return; x0 = null; ayuda.textContent = textoAyuda;
      let extra = Math.abs(vx) > .35 ? Math.max(-2, Math.min(2, Math.round(-vx * 3))) : 0;
      if (extra && !quieto.matches) {
        const dir = Math.sign(extra); let resto = Math.min(Math.abs(extra), frames.length);
        const tic = () => { if (resto-- <= 0) return; mostrar(actual + dir); setTimeout(tic, 60 + (frames.length - resto) * 6); };
        tic();
      }
    };
    escena.addEventListener('pointerup', soltar);
    escena.addEventListener('pointercancel', soltar);
  }

  /* ---------- reels: una sola vista previa a la vez; visor con sonido al tocar ---------- */
  const reels = $$('.reel');
  if (reels.length) {
    let activo = null;
    const vista = (r, si) => {
      const v = r.querySelector('video');
      if (si && !quieto.matches) {
        if (activo && activo !== r) vista(activo, false);
        if (!v.src) v.src = v.dataset.vista;
        v.play().catch(() => {});
        activo = r;
      } else if (v.src) { v.pause(); if (activo === r) activo = null; }
    };
    if (fino.matches) {
      // con ratón: corre la que está bajo el cursor o con el foco
      reels.forEach(r => {
        r.addEventListener('pointerenter', () => vista(r, true));
        r.addEventListener('pointerleave', () => vista(r, false));
        r.addEventListener('focus', () => vista(r, true));
        r.addEventListener('blur', () => vista(r, false));
      });
    } else {
      // en el teléfono: solo la que queda al centro del carrusel
      const io = new IntersectionObserver(es => es.forEach(({ target, isIntersecting }) => vista(target, isIntersecting)),
        { rootMargin: '0px -38% 0px -38%', threshold: .01 });
      reels.forEach(r => io.observe(r));
    }

    const visor = $('[data-visor]');
    const vv = $('[data-visor-video]');
    const ig = $('[data-visor-ig]');
    let origen = null;
    reels.forEach(r => r.addEventListener('click', () => {
      origen = r;
      if (activo) vista(activo, false);
      vv.src = r.dataset.reel;
      vv.poster = r.querySelector('video').poster;
      ig.href = r.dataset.ig;
      visor.setAttribute('aria-label', 'Video: ' + r.querySelector('.reel__txt').textContent.replace('Reproducir:', '').trim());
      visor.showModal();
      vv.play().catch(() => {});
    }));
    $('[data-visor-cerrar]').addEventListener('click', () => visor.close());
    visor.addEventListener('click', e => { if (e.target === visor) visor.close(); });
    visor.addEventListener('close', () => { vv.pause(); vv.removeAttribute('src'); vv.load(); origen?.focus(); });
  }

  /* ---------- comunidad: capítulos que se descubren al avanzar ---------- */
  const ruta = $('[data-capitulos]');
  if (ruta && !quieto.matches) {
    const fotos = $$('.ruta__foto', ruta);
    const caps = $$('.cap', ruta);
    const marco = $('.ruta__fotos', ruta);
    const textoR = $('.ruta__texto', ruta);
    const barraP = document.createElement('div');
    barraP.className = 'ruta__barra'; barraP.innerHTML = '<i></i>';
    let vivo = false, pendiente = false;
    // solo se fija si todo el texto cabe en la pantalla (si no, el capítulo 04 quedaría fuera)
    const cabe = () => innerWidth >= 961 && textoR.offsetHeight + 72 + 48 <= innerHeight;
    const pintar = () => {
      pendiente = false;
      if (!vivo) return;
      const r = ruta.getBoundingClientRect();
      const p = clamp(-r.top / (ruta.offsetHeight - innerHeight), 0, 1);
      const n = fotos.length;
      // un respiro quieto al inicio y al final; en medio, cada foto se destapa y luego se queda para leer
      const t = clamp(p * (n - 1) * 1.2 - .3, 0, n - 1);
      fotos.forEach((f, i) => {
        if (i === 0) { f.style.setProperty('--z', (1.08 - .08 * clamp(t * 2, 0, 1)).toFixed(4)); return; }
        const local = clamp((t - (i - .5)) / .5, 0, 1);
        const e = 1 - Math.pow(1 - local, 3);
        f.style.clipPath = `inset(${(100 - e * 100).toFixed(2)}% 0 0 0)`;
        f.style.setProperty('--z', (1.08 - .08 * e).toFixed(4));
      });
      const actual = clamp(Math.floor(t + .25), 0, n - 1);
      caps.forEach((c, i) => c.classList.toggle('actual', i === actual));
      barraP.style.setProperty('--p', p.toFixed(4));
    };
    const montar = () => {
      if (vivo) ruta.classList.remove('vivo'); // medir el texto en su forma normal
      const debe = cabe();
      ruta.classList.toggle('vivo', debe);
      if (debe !== vivo) {
        vivo = debe;
        if (vivo) marco.append(barraP); else {
          barraP.remove();
          fotos.forEach(f => { f.style.clipPath = ''; f.style.removeProperty('--z'); });
          caps.forEach(c => c.classList.remove('actual'));
        }
      }
      pintar();
    };
    addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }, { passive: true });
    let espera; addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(montar, 120); });
    montar();
  }

  /* ---------- horario: abierto o cerrado según la hora de Malinalco ---------- */
  const estado = $('[data-abierto]');
  if (estado) {
    const ahora = () => {
      const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
        .formatToParts(new Date()).map(p => [p.type, p.value]));
      const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partes.weekday);
      return { dia, min: +partes.hour * 60 + +partes.minute };
    };
    const pintarHorario = () => {
      const { dia, min } = ahora();
      const semana = dia >= 1 && dia <= 5;
      const cierra = semana ? 19 * 60 + 30 : 17 * 60;
      const abierto = min >= 9 * 60 && min < cierra;
      estado.hidden = false;
      estado.classList.toggle('cerrado', !abierto);
      estado.textContent = abierto ? 'Abierto ahora · cerramos a las ' + (semana ? '19:30' : '17:00')
        : (min < 9 * 60 ? 'Cerrado · abrimos hoy a las 9:00' : 'Cerrado · abrimos mañana a las 9:00');
      $$('[data-dias]').forEach(d => d.classList.toggle('hoy', d.dataset.dias === (semana ? '1-5' : '6-0')));
    };
    pintarHorario();
    setInterval(pintarHorario, 60000);
  }

  const anio = $('[data-anio]');
  if (anio) anio.textContent = new Date().getFullYear();
})();
