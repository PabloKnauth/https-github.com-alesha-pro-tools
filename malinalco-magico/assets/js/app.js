(function () {
  "use strict";
  var D = window.MM || { casas: [] };
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var MES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var MS = 86400000, FOTOS = "assets/img/casas/";
  var CAL = !!D.calendarioAlDia;

  /* ---------- utilidades ---------- */
  function fecha(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function clave(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function corta(d) { return d.getDate() + " " + MES_C[d.getMonth()]; }
  function larga(d) { return d.getDate() + " de " + MESES[d.getMonth()]; }
  var t = new Date(), HOY = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function max(c) { return c.personas ? c.personas[1] : 99; }
  function personas(c) { if (!c.personas) return "Capacidad a consultar"; return c.personas[0] === c.personas[1] ? c.personas[1] + " personas" : c.personas[0] + "–" + c.personas[1] + " personas"; }
  function datos(c) {
    var p = [personas(c), c.recamaras + (c.recamaras === 1 ? " recámara" : " recámaras")];
    if (c.banos) p.push(c.banos + (c.banos === 1 ? " baño" : " baños"));
    if (c.camas) p.push(c.camas);
    return p.join(" · ");
  }
  function choque(casa, ini, fin) {
    var rs = casa.ocupada || [];
    for (var i = 0; i < rs.length; i++) { var a = fecha(rs[i][0]), b = fecha(rs[i][1]); if (a < fin && ini < b) return [a, b]; }
    return null;
  }
  function libreDesde(casa, dia) {
    var d = new Date(dia), n = 0;
    while (n++ < 400) { var c = choque(casa, d, new Date(+d + MS)); if (!c) return d; d = c[1]; }
    return d;
  }

  /* ---------- estado de búsqueda ---------- */
  var busq = null, destino = "Todas";
  var fL = $("#f-llegada"), fS = $("#f-salida"), fH = $("#f-huespedes");
  fL.min = clave(HOY); fS.min = clave(new Date(+HOY + MS));
  fL.addEventListener("change", function () {
    if (!fL.value) return;
    var m = new Date(+fecha(fL.value) + MS); fS.min = clave(m);
    if (!fS.value || fecha(fS.value) <= fecha(fL.value)) fS.value = clave(m);
  });
  $("#buscador").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#buscador-error"), ini = fL.value && fecha(fL.value), fin = fS.value && fecha(fS.value);
    var msg = !ini || !fin ? "Elige fecha de llegada y de salida." : ini < HOY ? "La llegada no puede ser antes de hoy." : fin <= ini ? "La salida debe ser al menos un día después de la llegada." : "";
    err.textContent = msg; err.hidden = !msg; if (msg) return;
    busq = { ini: ini, fin: fin, huespedes: +fH.value };
    pintar();
    var n = Math.round((fin - ini) / MS), ok = visibles().filter(function (c) { return estado(c).reservable; }).length;
    $("#estado-busqueda").textContent = "Del " + corta(ini) + " al " + corta(fin) + " (" + n + (n === 1 ? " noche" : " noches") + ") para " + busq.huespedes +
      (busq.huespedes === 1 ? " persona: " : " personas: ") + (ok ? ok + (ok === 1 ? " casa te queda." : " casas te quedan.") : "ninguna casa te queda; prueba otras fechas o escríbenos.") +
      (CAL ? "" : " Confirmamos la disponibilidad por WhatsApp.");
    document.getElementById("casas").scrollIntoView({ behavior: "smooth" });
  });

  function estado(c) {
    if (busq && busq.huespedes > max(c)) return { tipo: "capacidad", texto: "Máximo " + max(c) + " personas", reservable: false };
    if (!CAL) return { tipo: "consulta", texto: busq ? "Pregunta por tus fechas" : "Consulta disponibilidad", reservable: true };
    if (busq) return choque(c, busq.ini, busq.fin) ? { tipo: "ocupada", texto: "Ocupada en tus fechas", reservable: false } : { tipo: "libre", texto: "Disponible en tus fechas", reservable: true };
    return choque(c, HOY, new Date(+HOY + MS)) ? { tipo: "ocupada", texto: "Ocupada · libre desde el " + corta(libreDesde(c, HOY)), reservable: true } : { tipo: "libre", texto: "Disponible hoy", reservable: true };
  }

  /* ---------- WhatsApp ---------- */
  function wa(c, extra) {
    var txt = "Hola, Malinalco Mágico. ";
    if (c) {
      txt += extra === "ubicacion" ? "¿Me comparten la ubicación de *" + c.nombre + "*?" : "Me interesa *" + c.nombre + "*";
      if (extra !== "ubicacion") {
        if (busq) txt += " del " + larga(busq.ini) + " al " + larga(busq.fin) + " de " + busq.fin.getFullYear() + " para " + busq.huespedes + (busq.huespedes === 1 ? " persona" : " personas");
        txt += ". ¿Está disponible y cuál sería la cotización?";
      }
    } else txt += "Quiero información para rentar una casa.";
    return "https://wa.me/" + D.whatsapp + "?text=" + encodeURIComponent(txt);
  }
  document.querySelectorAll('[data-wa="general"]').forEach(function (a) { a.href = wa(null); a.target = "_blank"; a.rel = "noopener"; });

  /* ---------- filtros de destino ---------- */
  var destinos = ["Todas"].concat(D.casas.map(function (c) { return c.destino; }).filter(function (d, i, a) { return a.indexOf(d) === i; }));
  function pintarFiltros() {
    $("#filtros").innerHTML = destinos.map(function (d) {
      var n = d === "Todas" ? D.casas.length : D.casas.filter(function (c) { return c.destino === d; }).length;
      return '<button type="button" class="filtro" aria-pressed="' + (d === destino) + '" data-destino="' + esc(d) + '">' + esc(d) + ' <span>' + n + "</span></button>";
    }).join("");
  }
  $("#filtros").addEventListener("click", function (e) {
    var b = e.target.closest("[data-destino]"); if (!b) return;
    destino = b.getAttribute("data-destino"); pintarFiltros(); pintar();
  });
  function visibles() { return D.casas.filter(function (c) { return destino === "Todas" || c.destino === destino; }); }

  /* ---------- tarjetas ---------- */
  function img(c, n, cls, ansioso, tam) {
    var f = c.fotos[n] || c.fotos[0], dir = FOTOS + (tam ? tam + "/" : "");
    return '<img' + (cls ? ' class="' + cls + '"' : "") + ' src="' + dir + esc(f) + '.webp" alt="' + esc(c.nombre) + ", foto " + (n + 1) + ' de ' + c.fotos.length + '" loading="' + (ansioso ? "eager" : "lazy") + '" decoding="async">';
  }
  function pintar() {
    var lista = visibles().map(function (c) { return { c: c, e: estado(c) }; });
    if (busq) lista.sort(function (a, b) { return (b.e.reservable ? 1 : 0) - (a.e.reservable ? 1 : 0); });
    $("#lista-casas").innerHTML = lista.map(function (o) {
      var c = o.c, e = o.e;
      return '<article class="casa" data-id="' + c.id + '">' +
        '<div class="casa__foto">' + img(c, 0, null, true, "med") +
          '<span class="estado estado--' + e.tipo + '">' + esc(e.texto) + "</span>" +
          (c.etiqueta ? '<span class="casa__etiqueta">' + esc(c.etiqueta) + "</span>" : "") +
          '<button class="casa__fotos" type="button" data-ver="' + c.id + '">' + c.fotos.length + " fotos</button></div>" +
        '<div class="casa__cuerpo"><p class="casa__destino">' + esc(c.destino) + (c.centro ? " · " + esc(c.centro.texto) : "") + "</p>" +
        '<h3 class="casa__nombre">' + esc(c.nombre) + "</h3>" +
        '<p class="casa__datos">' + esc(datos(c)) + '</p><p class="casa__resumen">' + esc(c.resumen) + "</p>" +
        '<ul class="amenidades">' + c.amenidades.slice(0, 4).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") +
          (c.amenidades.length > 4 ? "<li>+" + (c.amenidades.length - 4) + "</li>" : "") + "</ul>" +
        '<div class="casa__pie"><span class="precio">Cotiza <small>según personas y fechas</small></span><div class="casa__botones">' +
          '<button class="boton boton--linea" type="button" data-ver="' + c.id + '">Ver casa</button>' +
          '<a class="boton boton--terracota" href="' + wa(c) + '" target="_blank" rel="noopener"' + (e.reservable ? "" : ' aria-disabled="true" tabindex="-1"') + ">Reservar</a>" +
        "</div></div></div></article>";
    }).join("");
    pines();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ver]"); if (b) abrir(b.getAttribute("data-ver"), +(b.getAttribute("data-foto-n") || 0));
  });

  /* ---------- modal con galería ---------- */
  var modal = $("#modal"), casaModal = null, fotoN = 0, mesBase = null;
  function abrir(id, n) {
    var c = casaModal = D.casas.find(function (x) { return x.id === id; }); if (!c) return;
    var e = estado(c); fotoN = 0;
    try { history.replaceState(null, "", "#casa-" + c.id); } catch (er) {}
    $("#galeria-miniaturas").innerHTML = c.fotos.map(function (f, n) {
      return '<button type="button" data-n="' + n + '" aria-label="Ver foto ' + (n + 1) + '"><img src="' + FOTOS + "min/" + esc(f) + '.webp" alt="" loading="lazy"></button>';
    }).join("");
    foto(n || 0);
    $("#modal-estado").textContent = c.destino + " · " + e.texto;
    $("#modal-titulo").textContent = c.nombre;
    $("#modal-datos").textContent = datos(c) + (c.centro ? " · " + c.centro.texto : "");
    $("#modal-resumen").textContent = c.resumen;
    $("#modal-amenidades").innerHTML = c.amenidades.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
    var rg = $("#modal-reglas"); rg.hidden = !(c.reglas && c.reglas.length); rg.innerHTML = c.reglas && c.reglas.length ? "<strong>Reglas de la casa:</strong> " + c.reglas.map(esc).join(" · ") : "";
    var r = $("#modal-reservar"); r.href = wa(c); r.setAttribute("aria-disabled", e.reservable ? "false" : "true");
    var m = $("#modal-mapa");
    if (c.maps) { m.href = c.maps; m.textContent = "Cómo llegar"; } else { m.href = wa(c, "ubicacion"); m.textContent = "Pedir ubicación"; }
    $("#modal-nota-cal").textContent = CAL ? "" : "Marcamos tus fechas en el calendario; te confirmamos la disponibilidad por WhatsApp. " + (D.nota || "");
    var base = busq ? busq.ini : HOY; mesBase = new Date(base.getFullYear(), base.getMonth(), 1);
    calendarios();
    if (modal.showModal) modal.showModal(); else modal.setAttribute("open", "");
  }
  function foto(n) {
    var c = casaModal, total = c.fotos.length; fotoN = (n + total) % total;
    $("#galeria-principal").innerHTML = img(c, fotoN, null, true);
    $("#galeria-cuenta").textContent = (fotoN + 1) + " / " + total;
    [].forEach.call(document.querySelectorAll("#galeria-miniaturas button"), function (b, i) { b.setAttribute("aria-current", i === fotoN ? "true" : "false"); });
    var act = document.querySelector('#galeria-miniaturas [aria-current="true"]'); if (act && act.scrollIntoView) act.scrollIntoView({ block: "nearest", inline: "center" });
  }
  modal.addEventListener("click", function (e) {
    var a = e.target.closest("[data-foto]"); if (a) return foto(fotoN + +a.getAttribute("data-foto"));
    var m = e.target.closest("[data-n]"); if (m) return foto(+m.getAttribute("data-n"));
  });
  modal.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") foto(fotoN + 1); if (e.key === "ArrowLeft") foto(fotoN - 1); });
  var x0 = null;
  $("#galeria-principal").addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  $("#galeria-principal").addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) foto(fotoN + (dx < 0 ? 1 : -1)); x0 = null; });

  function mesHTML(m) {
    var c = casaModal, celdas = [], des = (m.getDay() + 6) % 7, dias = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    for (var i = 0; i < des; i++) celdas.push('<span class="vacio"></span>');
    for (var d = 1; d <= dias; d++) {
      var f = new Date(m.getFullYear(), m.getMonth(), d), cls = [];
      if (f < HOY) cls.push("pasado");
      if (CAL && choque(c, f, new Date(+f + MS))) cls.push("ocupado");
      if (busq && f >= busq.ini && f < busq.fin) cls.push("tuyo");
      if (+f === +HOY) cls.push("hoy");
      celdas.push('<span class="' + cls.join(" ") + '">' + d + "</span>");
    }
    return '<div class="mes"><h4>' + MESES[m.getMonth()] + " " + m.getFullYear() + '</h4><div class="mes__rejilla"><b>L</b><b>M</b><b>M</b><b>J</b><b>V</b><b>S</b><b>D</b>' + celdas.join("") + "</div></div>";
  }
  function calendarios() {
    $("#modal-calendario").innerHTML = mesHTML(mesBase) + mesHTML(new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 1)) +
      '<div class="calendarios__nav"><button class="boton boton--linea boton--chico" type="button" data-mes="-1">‹ Anteriores</button><button class="boton boton--linea boton--chico" type="button" data-mes="1">Siguientes ›</button></div>';
  }
  $("#modal-calendario").addEventListener("click", function (e) {
    var b = e.target.closest("[data-mes]"); if (!b) return;
    var n = new Date(mesBase.getFullYear(), mesBase.getMonth() + 2 * +b.getAttribute("data-mes"), 1);
    if (n < new Date(HOY.getFullYear(), HOY.getMonth(), 1)) return;
    mesBase = n; calendarios();
  });
  document.querySelector(".leyenda").hidden = false;
  if (!CAL) document.querySelector(".d--ocupado").parentNode.hidden = true;

  /* ---------- mapa de distancias ---------- */
  var CX = 48, CY = 44, activa = null;
  function radio(min) { return min <= 0 ? 3.6 : 7 + min * 0.95; }
  function anillos() {
    var mins = D.casas.filter(function (c) { return c.centro && c.centro.min > 0; }).map(function (c) { return c.centro.min; })
      .filter(function (m, i, a) { return a.indexOf(m) === i; }).sort(function (a, b) { return a - b; });
    $("#anillos").innerHTML = mins.map(function (m) {
      var r = radio(m);
      return '<circle cx="' + CX + '" cy="' + CY + '" r="' + r + '" fill="none" stroke="#F36B16" stroke-width=".35" stroke-dasharray="1.2 1" opacity=".55"/>' +
        '<text x="' + (CX - 1.2) + '" y="' + (CY + r + 2.4) + '" text-anchor="end" class="anillo">' + m + " min</text>";
    }).join("");
  }
  function pines() {
    var g = $("#pines"); if (!g) return;
    g.innerHTML = D.casas.filter(function (c) { return c.centro; }).map(function (c) {
      var r = radio(c.centro.min), a = (c.angulo || 0) * Math.PI / 180, x = CX + r * Math.cos(a), y = CY + r * Math.sin(a);
      var oc = !estado(c).reservable;
      return '<g class="pin' + (oc ? " ocupada" : "") + (activa === c.id ? " activa" : "") + '" data-pin="' + c.id + '" tabindex="0" role="button" aria-label="' + esc(c.nombre) + '" transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ')">' +
        '<circle class="halo" r="2.4"/><path d="M0 0 C-2.6 -3 -2.8 -4.4 -2.8 -5.4 A2.8 2.8 0 0 1 2.8 -5.4 C2.8 -4.4 2.6 -3 0 0 Z"/><circle r=".9" cy="-5.3" fill="#FFF8F0"/>' +
        '<text y="3.4" text-anchor="middle">' + esc(c.corto || c.nombre.replace(/^Casa /, "")) + "</text></g>";
    }).join("");
    var otras = D.casas.filter(function (c) { return !c.centro; });
    $("#otras-casas").innerHTML = otras.length ? "Sin distancia publicada: " + otras.map(function (c) {
      return '<button type="button" class="enlace" data-ficha="' + c.id + '">' + esc(c.nombre) + (c.destino !== "Malinalco" ? " (" + esc(c.destino) + ")" : "") + "</button>";
    }).join(", ") + ". Pídenos su ubicación." : "";
  }
  function ficha(id) {
    var c = D.casas.find(function (x) { return x.id === id; }); if (!c) return;
    activa = id; pines();
    $("#ficha-mapa").innerHTML = "<h3>" + esc(c.nombre) + "</h3><p>" + esc(c.destino) + (c.centro ? " · " + esc(c.centro.texto) : "") + " · " + esc(personas(c)) + "</p>" +
      '<a class="boton boton--terracota boton--chico" href="' + esc(c.maps || wa(c, "ubicacion")) + '" target="_blank" rel="noopener">' + (c.maps ? "Cómo llegar" : "Pedir ubicación") + "</a>" +
      '<button class="boton boton--linea boton--chico" type="button" data-ver="' + c.id + '">Ver casa</button>';
  }
  var svgMapa = $("#mapa-svg");
  svgMapa.addEventListener("click", function (e) { var p = e.target.closest("[data-pin]"); if (p) ficha(p.getAttribute("data-pin")); });
  svgMapa.addEventListener("keydown", function (e) { var p = e.target.closest("[data-pin]"); if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ficha(p.getAttribute("data-pin")); } });
  $("#otras-casas").addEventListener("click", function (e) { var b = e.target.closest("[data-ficha]"); if (b) ficha(b.getAttribute("data-ficha")); });
  $(".mapa__google").addEventListener("toggle", function () { var f = $("#iframe-mapa"); if (this.open && !f.src) f.src = D.mapaGoogle; });

  /* ---------- animaciones al desplazarse ---------- */
  var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var barra = $("#barra"), progreso = document.createElement("div");
  progreso.className = "progreso"; progreso.setAttribute("aria-hidden", "true"); document.body.appendChild(progreso);
  function alDesplazar() {
    var y = window.scrollY, alto = document.documentElement.scrollHeight - window.innerHeight;
    progreso.style.transform = "scaleX(" + (alto > 0 ? Math.min(1, y / alto) : 0) + ")";
    barra.classList.toggle("compacta", y > 40);
  }
  window.addEventListener("scroll", alDesplazar, { passive: true }); alDesplazar();

  var revelador = null;
  if (!reducir && "IntersectionObserver" in window) {
    revelador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visible"); revelador.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  }
  // Solo se ocultan los elementos que aún no están en pantalla, para que nada quede invisible al cargar.
  function animar(selector, tipo, escalon) {
    if (!revelador) return;
    [].forEach.call(document.querySelectorAll(selector), function (el, i) {
      if (el.classList.contains("anim")) return;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      el.classList.add("anim", "anim--" + tipo);
      if (escalon) el.style.setProperty("--retraso", ((i % 3) * escalon).toFixed(2) + "s");
      revelador.observe(el);
    });
  }
  function prepararAnimaciones() {
    animar(".seccion__cab", "subir");
    animar(".filtros", "subir");
    animar(".casa", "subir", 0.12);
    animar(".mosaico__item", "zoom", 0.1);
    animar(".mapa__txt", "izq");
    animar(".mapa__lienzo", "der");
    animar(".lugar", "subir", 0.14);
    animar(".reservar > div", "izq");
    animar(".pasos li", "subir", 0.14);
    animar(".reservar > .boton", "der");
    animar(".pie__in > *", "subir", 0.12);
  }

  /* ---------- paralaje ---------- */
  var capas = [].slice.call(document.querySelectorAll(".hero__paisaje .capa"));
  if (!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var pend = false;
    window.addEventListener("scroll", function () {
      if (pend) return; pend = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 900);
        capas.forEach(function (c) { c.style.transform = "translateY(" + (-y * +c.getAttribute("data-v")) + "px)"; });
        pend = false;
      });
    }, { passive: true });
  }

  /* ---------- arranque ---------- */
  $("#pie-tel").textContent = D.telefono;
  $("#pie-fb").href = D.facebook; $("#pie-ig").href = D.instagram;
  $("#anio").textContent = HOY.getFullYear();
  pintarFiltros(); anillos(); pintar();

  /* ---------- fotos destacadas ---------- */
  var MOSAICO = [["puente-de-dios", 1], ["casa-copal", 0], ["paso-de-agua", 0], ["casa-mali", 0], ["casa-colibri", 0], ["casa-marea", 0]];
  $("#mosaico").innerHTML = MOSAICO.map(function (m, i) {
    var c = D.casas.find(function (x) { return x.id === m[0]; }); if (!c) return "";
    return '<button type="button" class="mosaico__item mosaico__item--' + (i + 1) + '" data-ver="' + c.id + '" data-foto-n="' + m[1] + '">' +
      img(c, m[1], null, false, "med") + '<span><strong>' + esc(c.nombre) + "</strong>" + esc(c.destino) + "</span></button>";
  }).join("");

  /* ---------- enlace propio por casa y compartir ---------- */
  modal.addEventListener("close", function () { try { history.replaceState(null, "", location.pathname + location.search); } catch (er) {} });
  function desdeHash() { var m = /^#casa-([a-z0-9-]+)$/.exec(location.hash); if (m && D.casas.some(function (c) { return c.id === m[1]; })) abrir(m[1]); }
  window.addEventListener("hashchange", desdeHash); desdeHash();
  $("#modal-compartir").addEventListener("click", function () {
    var c = casaModal, url = location.href.split("#")[0] + "#casa-" + c.id, btn = this;
    var datosC = { title: c.nombre + " · Malinalco Mágico", text: c.nombre + ": " + c.resumen, url: url };
    if (navigator.share) { navigator.share(datosC).catch(function () {}); return; }
    var listo = function (ok) { btn.textContent = ok ? "Enlace copiado" : url; setTimeout(function () { btn.textContent = "Compartir"; }, 2400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { listo(true); }, function () { listo(false); });
    else listo(false);
  });
  var primera = D.casas.find(function (c) { return c.centro; }); if (primera) ficha(primera.id);
  prepararAnimaciones();
})();
