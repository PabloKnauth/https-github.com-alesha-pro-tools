(function () {
  "use strict";
  var D = window.MM || { casas: [] };
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var MES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var MS = 86400000;

  /* ---------- fechas ---------- */
  function fecha(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function clave(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function corta(d) { return d.getDate() + " " + MES_C[d.getMonth()]; }
  var t = new Date(), HOY = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ¿Está ocupada la casa en el periodo [ini, fin)? Devuelve el rango que choca o null.
  function choque(casa, ini, fin) {
    var rs = casa.ocupada || [];
    for (var i = 0; i < rs.length; i++) {
      var a = fecha(rs[i][0]), b = fecha(rs[i][1]);
      if (a < fin && ini < b) return [a, b];
    }
    return null;
  }
  function libreDesde(casa, dia) {
    var d = new Date(dia), guard = 0;
    while (guard++ < 400) { var c = choque(casa, d, new Date(+d + MS)); if (!c) return d; d = c[1]; }
    return d;
  }

  /* ---------- búsqueda ---------- */
  var busq = null; // {ini, fin, huespedes}
  var fL = $("#f-llegada"), fS = $("#f-salida"), fH = $("#f-huespedes");
  fL.min = clave(HOY); fS.min = clave(new Date(+HOY + MS));
  fL.addEventListener("change", function () {
    if (fL.value) { var m = new Date(+fecha(fL.value) + MS); fS.min = clave(m); if (!fS.value || fecha(fS.value) <= fecha(fL.value)) fS.value = clave(m); }
  });
  $("#buscador").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#buscador-error");
    if (!fL.value || !fS.value) { err.textContent = "Elige fecha de llegada y de salida."; err.hidden = false; return; }
    var ini = fecha(fL.value), fin = fecha(fS.value);
    if (ini < HOY) { err.textContent = "La llegada no puede ser antes de hoy."; err.hidden = false; return; }
    if (fin <= ini) { err.textContent = "La salida debe ser al menos un día después de la llegada."; err.hidden = false; return; }
    err.hidden = true;
    busq = { ini: ini, fin: fin, huespedes: +fH.value };
    pintar();
    var noches = Math.round((fin - ini) / MS);
    var libres = D.casas.filter(function (c) { return disponibilidad(c).tipo === "libre"; }).length;
    $("#estado-busqueda").textContent = "Del " + corta(ini) + " al " + corta(fin) + " (" + noches + (noches === 1 ? " noche" : " noches") + ") · " +
      busq.huespedes + (busq.huespedes === 1 ? " huésped" : " huéspedes") + ": " + (libres ? libres + (libres === 1 ? " casa disponible." : " casas disponibles.") : "ninguna casa libre; prueba otras fechas o escríbenos.");
    document.getElementById("casas").scrollIntoView({ behavior: "smooth" });
  });

  function disponibilidad(casa) {
    if (busq) {
      if (busq.huespedes > casa.huespedes) return { tipo: "capacidad", texto: "Hasta " + casa.huespedes + " huéspedes" };
      var c = choque(casa, busq.ini, busq.fin);
      return c ? { tipo: "ocupada", texto: "Ocupada en tus fechas" } : { tipo: "libre", texto: "Disponible en tus fechas" };
    }
    var hoy = choque(casa, HOY, new Date(+HOY + MS));
    if (hoy) return { tipo: "ocupada", texto: "Ocupada · libre desde el " + corta(libreDesde(casa, HOY)) };
    return { tipo: "libre", texto: "Disponible hoy" };
  }

  /* ---------- WhatsApp ---------- */
  function wa(casa) {
    var txt = "Hola, Malinalco Mágico. ";
    if (casa) {
      txt += "Me interesa reservar *" + casa.nombre + "*";
      if (busq) txt += " del " + busq.ini.getDate() + " de " + MESES[busq.ini.getMonth()] + " al " + busq.fin.getDate() + " de " + MESES[busq.fin.getMonth()] + " de " + busq.fin.getFullYear() + " para " + busq.huespedes + (busq.huespedes === 1 ? " persona" : " personas");
      txt += ". ¿Está disponible?";
    } else txt += "Quiero información para reservar una casa.";
    return "https://wa.me/" + D.whatsapp + "?text=" + encodeURIComponent(txt);
  }
  document.querySelectorAll('[data-wa="general"]').forEach(function (a) { a.href = wa(null); a.target = "_blank"; a.rel = "noopener"; });

  /* ---------- tarjetas ---------- */
  var ICONO = '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M28 196 V92 A72 72 0 0 1 172 92 V196" fill="none" stroke="currentColor" stroke-width="6"/><path d="M47 160 L78 92 L100 133 L122 92 L153 160 Z" fill="currentColor"/><path d="M52 176 Q63 170 74 176 T96 176 T118 176 T140 176" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>';
  var VAR = ["", " provisional--b", " provisional--c"];
  function foto(casa, i, n) {
    var f = (casa.fotos || [])[n || 0];
    if (f) return '<img src="' + esc(f) + '" alt="' + esc(casa.nombre) + ', foto ' + ((n || 0) + 1) + '" loading="lazy">';
    return '<div class="provisional' + VAR[i % 3] + '">' + '<div>' + ICONO + 'Foto próximamente</div></div>';
  }
  function precio(casa) {
    return casa.precio ? '<span class="precio">$' + Number(casa.precio).toLocaleString("es-MX") + ' <small>MXN / noche</small></span>' : '<span class="precio">Consultar <small>precio</small></span>';
  }
  function datos(casa) { return casa.huespedes + " huéspedes · " + casa.recamaras + " recámaras · " + casa.banos + (casa.banos === 1 ? " baño" : " baños"); }

  function pintar() {
    var lista = D.casas.map(function (c, i) { return { c: c, i: i, d: disponibilidad(c) }; });
    if (busq) lista.sort(function (a, b) { return (a.d.tipo === "libre" ? 0 : 1) - (b.d.tipo === "libre" ? 0 : 1); });
    $("#lista-casas").innerHTML = lista.map(function (o) {
      var c = o.c, d = o.d, puede = d.tipo === "libre";
      return '<article class="casa">' +
        '<div class="casa__foto">' + foto(c, o.i) + '<span class="estado estado--' + d.tipo + '">' + esc(d.texto) + '</span></div>' +
        '<div class="casa__cuerpo"><h3 class="casa__nombre">' + esc(c.nombre) + '</h3>' +
        '<p class="casa__datos">' + datos(c) + '</p><p class="casa__resumen">' + esc(c.resumen) + '</p>' +
        '<ul class="amenidades">' + (c.amenidades || []).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + '</ul>' +
        '<div class="casa__pie">' + precio(c) + '<div class="casa__botones">' +
          '<button class="boton boton--linea" type="button" data-ver="' + c.id + '">Ver casa</button>' +
          '<a class="boton boton--terracota" href="' + wa(c) + '" target="_blank" rel="noopener"' + (busq && !puede ? ' aria-disabled="true" tabindex="-1"' : "") + '>Reservar</a>' +
        '</div></div></div></article>';
    }).join("");
    pines();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ver]"); if (b) abrir(b.getAttribute("data-ver"));
  });

  /* ---------- modal ---------- */
  var modal = $("#modal"), casaModal = null, mesBase = null;
  function abrir(id) {
    var i = D.casas.findIndex(function (c) { return c.id === id; }); if (i < 0) return;
    var c = casaModal = D.casas[i], d = disponibilidad(c);
    $("#modal-galeria").innerHTML = [0, 1, 2].map(function (n) { return foto(c, (i + n) % 3, n); }).join("");
    $("#modal-estado").textContent = d.texto;
    $("#modal-titulo").textContent = c.nombre;
    $("#modal-datos").textContent = datos(c) + (c.precio ? " · $" + Number(c.precio).toLocaleString("es-MX") + " MXN por noche" : "");
    $("#modal-resumen").textContent = c.resumen;
    $("#modal-amenidades").innerHTML = (c.amenidades || []).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
    $("#modal-reservar").href = wa(c);
    $("#modal-mapa").href = c.maps || "#";
    var base = busq ? busq.ini : HOY; mesBase = new Date(base.getFullYear(), base.getMonth(), 1);
    calendarios();
    if (modal.showModal) modal.showModal(); else modal.setAttribute("open", "");
  }
  function mesHTML(m) {
    var c = casaModal, celdas = [], des = (m.getDay() + 6) % 7, dias = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    for (var i = 0; i < des; i++) celdas.push('<span class="vacio"></span>');
    for (var d = 1; d <= dias; d++) {
      var f = new Date(m.getFullYear(), m.getMonth(), d), cls = [];
      if (f < HOY) cls.push("pasado");
      if (choque(c, f, new Date(+f + MS))) cls.push("ocupado");
      if (busq && f >= busq.ini && f < busq.fin) cls.push("tuyo");
      if (+f === +HOY) cls.push("hoy");
      celdas.push('<span class="' + cls.join(" ") + '">' + d + "</span>");
    }
    return '<div class="mes"><h4>' + MESES[m.getMonth()] + " " + m.getFullYear() + '</h4><div class="mes__rejilla"><b>L</b><b>M</b><b>M</b><b>J</b><b>V</b><b>S</b><b>D</b>' + celdas.join("") + "</div></div>";
  }
  function calendarios() {
    var m2 = new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 1);
    $("#modal-calendario").innerHTML = mesHTML(mesBase) + mesHTML(m2) +
      '<div style="grid-column:1/-1;display:flex;gap:8px"><button class="boton boton--linea boton--chico" type="button" data-mes="-1">‹ Meses anteriores</button><button class="boton boton--linea boton--chico" type="button" data-mes="1">Meses siguientes ›</button></div>';
  }
  $("#modal-calendario").addEventListener("click", function (e) {
    var b = e.target.closest("[data-mes]"); if (!b) return;
    var n = new Date(mesBase.getFullYear(), mesBase.getMonth() + 2 * +b.getAttribute("data-mes"), 1);
    if (n < new Date(HOY.getFullYear(), HOY.getMonth(), 1)) return;
    mesBase = n; calendarios();
  });

  /* ---------- mapa ---------- */
  var activa = null;
  function pines() {
    var g = $("#pines"); if (!g) return;
    g.innerHTML = D.casas.map(function (c) {
      if (!c.mapa) return "";
      var oc = disponibilidad(c).tipo !== "libre";
      return '<g class="pin' + (oc ? " ocupada" : "") + (activa === c.id ? " activa" : "") + '" data-pin="' + c.id + '" tabindex="0" role="button" aria-label="' + esc(c.nombre) + '" transform="translate(' + c.mapa.x + " " + c.mapa.y + ')">' +
        '<circle class="halo" r="2.4"/><path d="M0 0 C-2.6 -3 -2.8 -4.4 -2.8 -5.4 A2.8 2.8 0 0 1 2.8 -5.4 C2.8 -4.4 2.6 -3 0 0 Z"/><circle r=".9" cy="-5.3" fill="#FFF8F0"/>' +
        '<text y="3.4" text-anchor="middle">' + esc(c.nombre) + "</text></g>";
    }).join("");
  }
  function ficha(id) {
    var c = D.casas.find(function (x) { return x.id === id; }); if (!c) return;
    activa = id; pines();
    var d = disponibilidad(c);
    $("#ficha-mapa").innerHTML = '<h3>' + esc(c.nombre) + '</h3><p>' + esc(d.texto) + " · " + datos(c) + '</p>' +
      '<a class="boton boton--terracota boton--chico" href="' + esc(c.maps || "#") + '" target="_blank" rel="noopener">Cómo llegar</a>' +
      '<button class="boton boton--linea boton--chico" type="button" data-ver="' + c.id + '">Ver casa</button>';
  }
  var svgMapa = $("#mapa-svg");
  svgMapa.addEventListener("click", function (e) { var p = e.target.closest("[data-pin]"); if (p) ficha(p.getAttribute("data-pin")); });
  svgMapa.addEventListener("keydown", function (e) { var p = e.target.closest("[data-pin]"); if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ficha(p.getAttribute("data-pin")); } });
  $(".mapa__google").addEventListener("toggle", function () { var f = $("#iframe-mapa"); if (this.open && !f.src) f.src = D.mapaGoogle; });

  /* ---------- paralaje del paisaje ---------- */
  var capas = [].slice.call(document.querySelectorAll(".hero__paisaje .capa"));
  var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!quieto) {
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

  /* ---------- varios ---------- */
  $("#aviso").hidden = !D.ejemplo;
  $("#pie-tel").textContent = D.telefono;
  $("#pie-fb").href = D.facebook; $("#pie-ig").href = D.instagram;
  $("#anio").textContent = HOY.getFullYear();
  pintar();
  if (D.casas[0]) ficha(D.casas[0].id);
})();
