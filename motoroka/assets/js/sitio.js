/* Moto Roka Fix & Shop — comportamiento del sitio. Sin dependencias.
   Todo respeta prefers-reduced-motion: sin script o con movimiento reducido la página se lee completa. */
(() => {
  const doc = document.documentElement;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- portada: entrada única y video ---------- */
  const video = $('[data-portada]');
  const btnPausa = $('[data-pausa-video]');
  let pausadoPorUsuario = false;
  const arrancar = () => requestAnimationFrame(() => doc.classList.add('listo'));
  if (document.readyState === 'complete') arrancar(); else addEventListener('load', arrancar, { once: true });
  setTimeout(arrancar, 1200); // por si una imagen tarda: la portada no se queda escondida

  const ponerPausa = (pausa) => {
    btnPausa.setAttribute('aria-pressed', String(pausa));
    btnPausa.querySelector('use').setAttribute('href', pausa ? '#play' : '#pausa');
    btnPausa.querySelector('span').textContent = pausa ? 'Reproducir video' : 'Pausar video';
  };
  if (video) {
    if (quieto.matches) { pausadoPorUsuario = true; ponerPausa(true); }
    else video.play().catch(() => ponerPausa(true));
    btnPausa.addEventListener('click', () => {
      if (video.paused) { pausadoPorUsuario = false; video.play(); ponerPausa(false); }
      else { pausadoPorUsuario = true; video.pause(); ponerPausa(true); }
    });
    // fuera de pantalla no gasta batería
    new IntersectionObserver(([e]) => {
      if (pausadoPorUsuario) return;
      if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
    }).observe(video);
  }

  /* ---------- barra: sólida después de la portada, se esconde al bajar ---------- */
  const barra = $('[data-barra]');
  const portada = $('.portada');
  const accion = $('[data-accion]');
  let ultimoY = scrollY;
  const alDesplazar = () => {
    const y = scrollY;
    const tras = portada ? portada.offsetHeight - 80 : 0;
    barra.classList.toggle('es-solida', y > 40);
    const bajando = y > ultimoY && y > tras;
    if (!barra.classList.contains('menu-abierto')) barra.classList.toggle('se-oculta', bajando && Math.abs(y - ultimoY) > 2);
    if (accion) accion.classList.toggle('visible', y > tras * .7);
    ultimoY = y;
  };
  addEventListener('scroll', alDesplazar, { passive: true });
  alDesplazar();

  /* ---------- menú del teléfono ---------- */
  const btnMenu = $('[data-menu-btn]');
  const cerrarMenu = () => {
    barra.classList.remove('menu-abierto');
    btnMenu.setAttribute('aria-expanded', 'false');
    btnMenu.querySelector('.sr').textContent = 'Abrir menú';
    document.body.style.overflow = '';
  };
  btnMenu.addEventListener('click', () => {
    const abrir = btnMenu.getAttribute('aria-expanded') !== 'true';
    if (!abrir) return cerrarMenu();
    barra.classList.add('menu-abierto');
    barra.classList.remove('se-oculta');
    btnMenu.setAttribute('aria-expanded', 'true');
    btnMenu.querySelector('.sr').textContent = 'Cerrar menú';
    document.body.style.overflow = 'hidden';
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
      // empieza cuando el texto entra al 85% de la pantalla y termina cuando su pie llega al 45%
      const p = clamp((vh * .85 - r.top) / (r.height + vh * .4), 0, 1);
      const n = Math.round(p * pals.length);
      pals.forEach((s, i) => s.classList.toggle('on', i < n));
    };
    addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }, { passive: true });
    pintar();
  }

  /* ---------- catálogo: filtro por marca con transición ---------- */
  const filtros = $('[data-filtros]');
  const motos = $$('[data-catalogo] .moto');
  if (filtros) {
    motos.forEach((m, i) => { m.style.viewTransitionName = `moto-${i}`; });
    filtros.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      const marca = b.dataset.marca;
      const aplicar = () => {
        $$('button', filtros).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        motos.forEach(m => { m.hidden = !(marca === 'todas' || m.dataset.marca === marca || m.dataset.marca === 'todas'); });
      };
      if (document.startViewTransition && !quieto.matches) document.startViewTransition(aplicar);
      else aplicar();
    });
  }

  /* ---------- reels: vista previa muda cuando se ven, visor con sonido al tocar ---------- */
  const reels = $$('.reel');
  if (reels.length) {
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(({ target, isIntersecting }) => {
        const v = target.querySelector('video');
        if (isIntersecting && !quieto.matches) {
          if (!v.src) v.src = v.dataset.vista;
          v.play().catch(() => {});
        } else if (v.src) v.pause();
      });
    }, { threshold: .35 });
    reels.forEach(r => io.observe(r));

    const visor = $('[data-visor]');
    const vv = $('[data-visor-video]');
    const ig = $('[data-visor-ig]');
    let origen = null;
    reels.forEach(r => r.addEventListener('click', () => {
      origen = r;
      vv.src = r.dataset.reel;
      vv.poster = r.querySelector('video').poster;
      ig.href = r.dataset.ig;
      visor.showModal();
      vv.play().catch(() => {});
    }));
    const cerrar = () => visor.close();
    $('[data-visor-cerrar]').addEventListener('click', cerrar);
    visor.addEventListener('click', e => { if (e.target === visor) cerrar(); });
    visor.addEventListener('close', () => { vv.pause(); vv.removeAttribute('src'); vv.load(); origen?.focus(); });
  }

  /* ---------- comunidad: capítulos que se descubren al avanzar ---------- */
  const ruta = $('[data-capitulos]');
  const altoSuficiente = () => innerHeight >= 600 && innerWidth >= 961;
  if (ruta && !quieto.matches) {
    const fotos = $$('.ruta__foto', ruta);
    const caps = $$('.cap', ruta);
    const marco = $('.ruta__fotos', ruta);
    const barraP = document.createElement('div');
    barraP.className = 'ruta__barra'; barraP.innerHTML = '<i></i>';
    let vivo = false, pendiente = false;
    const pintar = () => {
      pendiente = false;
      if (!vivo) return;
      const r = ruta.getBoundingClientRect();
      const recorrido = ruta.offsetHeight - innerHeight;
      const p = clamp(-r.top / recorrido, 0, 1);
      const n = fotos.length;
      const t = p * (n - 1); // 0..n-1
      fotos.forEach((f, i) => {
        if (i === 0) { f.style.setProperty('--z', (1.08 - .08 * clamp(t, 0, 1)).toFixed(4)); return; }
        // cada foto se destapa en la primera mitad de su tramo y luego se queda quieta para leer
        const local = clamp((t - (i - 1)) / .55, 0, 1);
        const e = 1 - Math.pow(1 - local, 3);
        f.style.clipPath = `inset(${(100 - e * 100).toFixed(2)}% 0 0 0)`;
        f.style.setProperty('--z', (1.08 - .08 * e).toFixed(4));
      });
      const actual = clamp(Math.floor(t + .7), 0, n - 1);
      caps.forEach((c, i) => c.classList.toggle('actual', i === actual));
      barraP.style.setProperty('--p', p.toFixed(4));
    };
    const montar = () => {
      const debe = altoSuficiente();
      if (debe === vivo) return pintar();
      vivo = debe;
      ruta.classList.toggle('vivo', vivo);
      if (vivo) marco.append(barraP); else {
        barraP.remove();
        fotos.forEach(f => { f.style.clipPath = ''; f.style.removeProperty('--z'); });
        caps.forEach(c => c.classList.remove('actual'));
      }
      pintar();
    };
    addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }, { passive: true });
    addEventListener('resize', montar);
    montar();
  }

  const anio = $('[data-anio]');
  if (anio) anio.textContent = new Date().getFullYear();
})();
