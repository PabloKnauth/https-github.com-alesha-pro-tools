/* Evaluaciones, ranking, amenidades con íconos y recámaras divididas. */
(function () {
  "use strict";
  var D = window.MM || { casas: [] }, EV = window.MM_EVAL || {};
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var CATS = [["limpieza", "Limpieza"], ["comodidad", "Comodidad"], ["alberca", "Alberca"], ["ubicacion", "Ubicación"], ["atencion", "Atención"]];
  var FOTOS = "assets/img/casas/";

  /* ---------- íconos (trazo 1.6, 24×24) ---------- */
  var P = {
    alberca: '<path d="M3 17c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 21c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M8 14V5a2 2 0 0 1 4 0M16 14V5a2 2 0 0 0-4 0M8 9h8"/>',
    jacuzzi: '<path d="M3 13h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM7 10c0-2 1-2 1-4M12 10c0-2 1-2 1-4M17 10c0-2 1-2 1-4"/>',
    asador: '<path d="M4 10h16a8 8 0 0 1-16 0zM8 17l-2 4M16 17l2 4M12 18v3M9 3c0 2 1 2 1 4M14 3c0 2 1 2 1 4"/>',
    wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
    auto: '<path d="M5 11l2-5h10l2 5M3 11h18v6H3zM6 17v2M18 17v2"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/>',
    jardin: '<path d="M12 21v-7M12 14c-4 0-6-3-6-6a6 6 0 0 1 12 0c0 3-2 6-6 6zM8 21h8"/>',
    terraza: '<path d="M3 10L12 4l9 6zM5 10v10M19 10v10M3 20h18M9 20v-5h6v5"/>',
    palapa: '<path d="M2 11c3-5 7-7 10-7s7 2 10 7zM12 11v10M8 21h8"/>',
    cocina: '<path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6zM2 11h2M20 11h2M9 7c0-1 1-1 1-3M14 7c0-1 1-1 1-3"/>',
    juegos: '<rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="8" cy="12.5" r="1.4"/><circle cx="16" cy="12.5" r="1.4"/><path d="M12 7V4"/>',
    cine: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4M10 8.5l4 1.5-4 1.5z"/>',
    bar: '<path d="M6 4h12l-6 8zM12 12v8M8 20h8"/>',
    gym: '<path d="M2 12h3M19 12h3M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8"/>',
    vista: '<path d="M2 20l6-9 4 5 3-4 7 8zM16 7a2 2 0 1 0 0-.1"/>',
    servicio: '<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 9V7M10 7h4M3 20h18"/>',
    cancha: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 5h-5L8 10z"/>',
    agua: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
    centro: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    seguridad: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    fuego: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-3-2 2-3 4-3 7a6 6 0 0 0 6 6z"/>',
    ninos: '<circle cx="12" cy="5" r="2"/><path d="M12 7v7M8 10h8M10 21l2-7 2 7"/>',
    sauna: '<path d="M4 20h16M6 20V9h12v11M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2M9 13h6"/>',
    cama: '<path d="M3 18V8M3 14h18v4M21 18v-4a3 3 0 0 0-3-3H10v3M6.5 11.5a1.5 1.5 0 1 0 0-.1"/>',
    bano: '<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V6a2 2 0 0 1 4 0M8 19l-1 2M16 19l1 2"/>',
    personas: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5.2"/>',
    puerta: '<rect x="5" y="3" width="14" height="18" rx="1"/><circle cx="15" cy="12" r="1"/>',
    ok: '<path d="M5 12l5 5 9-10"/>'
  };
  var REGLAS = [[/jacuzzi|chapoteadero/, "jacuzzi"], [/alberca|playita/, "alberca"], [/asador|parrilla/, "asador"], [/wifi/, "wifi"],
    [/estacionamiento/, "auto"], [/palapa/, "palapa"], [/terraza|rooftop/, "terraza"], [/huerta|árbol|jard/, "jardin"],
    [/cocin/, "cocina"], [/billar|juegos infantiles/, "juegos"], [/salón de juegos/, "juegos"], [/cine|pantalla/, "cine"], [/bar\b|barra/, "bar"],
    [/gym/, "gym"], [/sauna/, "sauna"], [/vista|bahía|cerro|valle/, "vista"], [/servicio|ayudante/, "servicio"], [/cancha|fútbol|voleibol/, "cancha"],
    [/lago|río|apancle/, "agua"], [/centro/, "centro"], [/acceso controlado|exclusiva/, "seguridad"], [/fogat/, "fuego"], [/niños/, "ninos"], [/sala-comedor/, "puerta"]];
  function icono(nombre, cls) { return '<svg class="' + (cls || "ico") + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[nombre] || P.ok) + "</svg>"; }
  function iconoDe(texto) {
    var t = String(texto).toLowerCase();
    for (var i = 0; i < REGLAS.length; i++) if (REGLAS[i][0].test(t)) return REGLAS[i][1];
    return "ok";
  }

  /* ---------- cálculo de calificaciones ---------- */
  function resumen(id) {
    var l = EV[id] || []; if (!l.length) return null;
    var tot = 0, cats = {};
    l.forEach(function (r) {
      tot += +r.estrellas;
      CATS.forEach(function (k) { var v = r.categorias && r.categorias[k[0]]; if (v) { cats[k[0]] = cats[k[0]] || [0, 0]; cats[k[0]][0] += +v; cats[k[0]][1]++; } });
    });
    var prom = {}; Object.keys(cats).forEach(function (k) { prom[k] = cats[k][0] / cats[k][1]; });
    var media = tot / l.length;
    return { media: media, n: l.length, cats: prom, favorito: media >= 4.8 && l.length >= 5 };
  }
  function fmt(x) { return x.toFixed(2).replace(/0$/, "").replace(/\.$/, ".0"); }
  function estrellas(v) { var s = ""; for (var i = 1; i <= 5; i++) s += '<span class="est' + (v >= i - 0.25 ? " est--llena" : "") + '">★</span>'; return '<span class="estrellas" aria-label="' + fmt(v) + ' de 5">' + s + "</span>"; }
  function mes(f) { if (!f) return ""; var p = String(f).split("-"); return MESES[(+p[1] || 1) - 1] + " de " + p[0]; }
  function iniciales(n) { return String(n || "?").trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0]; }).join("").toUpperCase(); }

  /* ---------- API usada por app.js ---------- */
  window.MMX = {
    icono: icono, iconoDe: iconoDe, resumen: resumen, fmt: fmt,
    chipTarjeta: function (c) {
      var r = resumen(c.id);
      return r ? '<span class="calif"><span class="calif__est">★</span> ' + fmt(r.media) + ' <small>(' + r.n + ")</small></span>" : '<span class="calif calif--nueva">Nueva en la web</span>';
    },
    amenidad: function (a) { return '<li class="amen">' + icono(iconoDe(a)) + "<span>" + esc(a) + "</span></li>"; },
    ficha: function (c) { fichaEval(c); fichaRecamaras(c); }
  };

  /* ---------- ficha: recámaras ---------- */
  function fichaRecamaras(c) {
    var cont = $("#modal-recamaras"); if (!cont) return;
    var hs = c.habitaciones;
    var vieja = cont.nextElementSibling; if (vieja && vieja.classList.contains("recamara__nota")) vieja.remove();
    if (hs && hs.length) {
      cont.innerHTML = hs.map(function (h, i) {
        var f = h.foto != null ? c.fotos[h.foto] : null;
        return '<article class="recamara">' + (f ? '<img src="' + FOTOS + "med/" + esc(f) + '.webp" onerror="this.src=\'' + FOTOS + esc(f) + '.webp\'" alt="' + esc(h.nombre || "Recámara " + (i + 1)) + '" loading="lazy">' : '<div class="recamara__ico">' + icono("cama", "ico ico--grande") + "</div>") +
          "<h4>" + esc(h.nombre || "Recámara " + (i + 1)) + "</h4><p>" + esc(h.camas || "") + "</p></article>";
      }).join("");
      return;
    }
    var items = [];
    if (c.personas) items.push(["personas", (c.personas[0] === c.personas[1] ? c.personas[1] : c.personas[0] + "–" + c.personas[1]) + " personas"]);
    items.push(["puerta", c.recamaras + (c.recamaras === 1 ? " recámara" : " recámaras")]);
    if (c.camas) items.push(["cama", c.camas]);
    if (c.banos) items.push(["bano", c.banos + (c.banos === 1 ? " baño" : " baños")]);
    cont.innerHTML = items.map(function (x) { return '<article class="recamara recamara--dato"><div class="recamara__ico">' + icono(x[0], "ico ico--grande") + "</div><p>" + esc(x[1]) + "</p></article>"; }).join("");
    var nota = cont.nextElementSibling && cont.nextElementSibling.classList.contains("recamara__nota") ? cont.nextElementSibling : null;
    if (!nota) { nota = document.createElement("p"); nota.className = "recamara__nota"; cont.parentNode.insertBefore(nota, cont.nextSibling); }
    nota.textContent = "Pregúntanos por WhatsApp cómo se reparten las camas en cada recámara.";
  }

  /* ---------- ficha: evaluaciones ---------- */
  function fichaEval(c) {
    var cont = $("#modal-evaluaciones"); if (!cont) return;
    var r = resumen(c.id), l = (EV[c.id] || []).slice().sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
    if (!r) {
      cont.innerHTML = '<div class="eval-vacio">' + icono("ok", "ico ico--grande") + "<div><h4>Todavía no hay evaluaciones publicadas</h4><p>¿Ya te hospedaste en " + esc(c.nombre) + "? Cuéntale a otros viajeros cómo te fue.</p></div>" +
        '<button class="boton boton--terracota boton--chico" type="button" data-evaluar="' + c.id + '">Escribir evaluación</button></div>';
      return;
    }
    var cats = CATS.filter(function (k) { return r.cats[k[0]]; }).map(function (k) {
      return '<li><span>' + k[1] + '</span><span class="barra-cat"><i style="width:' + (r.cats[k[0]] / 5 * 100).toFixed(0) + '%"></i></span><b>' + fmt(r.cats[k[0]]) + "</b></li>";
    }).join("");
    cont.innerHTML =
      '<div class="eval-cab">' +
        (r.favorito ? '<div class="laurel">' + laurel() + '<strong>' + fmt(r.media) + "</strong>" + laurel(true) + '</div><p class="eval-fav">Favorita de nuestros huéspedes</p>'
                    : '<div class="eval-nota"><strong>' + fmt(r.media) + "</strong>" + estrellas(r.media) + "</div>") +
        '<p class="eval-n">' + r.n + (r.n === 1 ? " evaluación" : " evaluaciones") + "</p>" +
      "</div>" +
      (cats ? '<ul class="eval-cats">' + cats + "</ul>" : "") +
      '<div class="resenas">' + l.map(function (x, i) {
        var largo = String(x.texto).length > 220;
        return '<article class="resena' + (i > 3 ? " resena--oculta" : "") + '"><header><span class="avatar">' + esc(iniciales(x.nombre)) + "</span><div><strong>" + esc(x.nombre) + "</strong><small>" + esc(x.ciudad || "") + "</small></div></header>" +
          "<p class=\"resena__meta\">" + estrellas(+x.estrellas) + " · " + esc(mes(x.fecha)) + "</p>" +
          '<p class="resena__texto' + (largo ? " resena__texto--corto" : "") + '">' + esc(x.texto) + "</p>" + (largo ? '<button class="enlace-oscuro" type="button" data-mas>Mostrar más</button>' : "") + "</article>";
      }).join("") + "</div>" +
      '<div class="eval-acciones">' + (l.length > 4 ? '<button class="boton boton--linea boton--chico" type="button" data-todas>Mostrar las ' + l.length + " evaluaciones</button>" : "") +
      '<button class="boton boton--terracota boton--chico" type="button" data-evaluar="' + c.id + '">Escribir evaluación</button></div>';
  }
  function laurel(der) {
    return '<svg class="laurel__rama' + (der ? " laurel__rama--der" : "") + '" viewBox="0 0 30 60" aria-hidden="true"><path d="M22 58C10 50 6 36 10 20" fill="none" stroke="currentColor" stroke-width="2"/>' +
      [[10, 20, -30], [8, 30, -20], [8, 40, -5], [11, 49, 10]].map(function (p) { return '<ellipse cx="' + (p[0] + 6) + '" cy="' + p[1] + '" rx="6" ry="3" transform="rotate(' + p[2] + ' ' + (p[0] + 6) + " " + p[1] + ')" fill="currentColor"/>'; }).join("") + "</svg>";
  }
  document.addEventListener("click", function (e) {
    var m = e.target.closest("[data-mas]"); if (m) { m.previousElementSibling.classList.remove("resena__texto--corto"); m.remove(); return; }
    var t = e.target.closest("[data-todas]"); if (t) { [].forEach.call(document.querySelectorAll(".resena--oculta"), function (x) { x.classList.remove("resena--oculta"); }); t.remove(); return; }
    var ev = e.target.closest("[data-evaluar]"); if (ev) abrirForm(ev.getAttribute("data-evaluar"));
  });

  /* ---------- ranking en portada ---------- */
  function pintarRanking() {
    var cont = $("#ranking-lista"); if (!cont) return;
    var lista = D.casas.map(function (c) { return { c: c, r: resumen(c.id) }; }).filter(function (x) { return x.r; })
      .sort(function (a, b) { return b.r.media - a.r.media || b.r.n - a.r.n; }).slice(0, 10);
    var total = D.casas.reduce(function (s, c) { return s + (EV[c.id] || []).length; }, 0);
    $("#ranking-total").textContent = total ? total + (total === 1 ? " evaluación publicada" : " evaluaciones publicadas") + " de huéspedes reales." : "";
    if (!lista.length) {
      cont.innerHTML = '<div class="ranking-vacio">' + icono("ok", "ico ico--grande") + "<div><h3>Estamos reuniendo las primeras evaluaciones</h3><p>Aquí aparecerán las casas mejor calificadas, solo con reseñas de huéspedes reales. ¿Ya te hospedaste con nosotros?</p></div>" +
        '<button class="boton boton--terracota" type="button" data-evaluar="">Escribir evaluación</button></div>';
      return;
    }
    cont.innerHTML = lista.map(function (x, i) {
      var c = x.c;
      return '<button type="button" class="rank' + (i < 3 ? " rank--podio" : "") + '" data-ver="' + c.id + '">' +
        '<span class="rank__pos">' + (i + 1) + "</span>" +
        '<img src="' + FOTOS + "min/" + esc(c.fotos[0]) + '.webp" onerror="this.src=\'' + FOTOS + esc(c.fotos[0]) + '.webp\'" alt="" loading="lazy">' +
        '<span class="rank__txt"><strong>' + esc(c.nombre) + "</strong><small>" + esc(c.destino) + " · " + x.r.n + (x.r.n === 1 ? " evaluación" : " evaluaciones") + "</small></span>" +
        '<span class="rank__nota">★ ' + fmt(x.r.media) + (x.r.favorito ? "<em>Favorita</em>" : "") + "</span></button>";
    }).join("");
  }

  /* ---------- formulario de evaluación ---------- */
  var dlg = $("#dlg-eval"), form = $("#form-eval");
  function abrirForm(id) {
    var sel = $("#ev-casa");
    if (!sel.options.length) sel.innerHTML = '<option value="">Elige la casa</option>' + D.casas.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nombre) + "</option>"; }).join("");
    sel.value = id || ""; $("#ev-gracias").hidden = true; form.hidden = false;
    var abierto = document.querySelector("dialog#modal[open]"); if (abierto && abierto.close) abierto.close();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  // selector de estrellas
  [].forEach.call(document.querySelectorAll(".selector-est"), function (g) {
    g.innerHTML = [1, 2, 3, 4, 5].map(function (v) { return '<button type="button" data-v="' + v + '" aria-label="' + v + ' de 5">★</button>'; }).join("");
    g.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      g.setAttribute("data-valor", b.getAttribute("data-v"));
      [].forEach.call(g.children, function (x) { x.classList.toggle("on", +x.getAttribute("data-v") <= +b.getAttribute("data-v")); });
    });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#ev-error"), d = {
      casa: $("#ev-casa").value, nombre: $("#ev-nombre").value.trim(), ciudad: $("#ev-ciudad").value.trim(), fecha: $("#ev-fecha").value,
      telefono: $("#ev-tel").value.trim(), texto: $("#ev-texto").value.trim(), estrellas: $("#ev-general").getAttribute("data-valor") || ""
    };
    CATS.forEach(function (k) { d[k[0]] = (document.querySelector('.selector-est[data-cat="' + k[0] + '"]') || {}).getAttribute ? document.querySelector('.selector-est[data-cat="' + k[0] + '"]').getAttribute("data-valor") || "" : ""; });
    var falta = !d.casa ? "Elige la casa en la que te hospedaste." : !d.nombre ? "Escribe tu nombre." : !d.estrellas ? "Elige tu calificación general." : d.texto.length < 30 ? "Cuéntanos un poco más (al menos 30 caracteres)." : "";
    err.textContent = falta; err.hidden = !falta; if (falta) return;
    var cuerpo = "form-name=evaluacion&" + Object.keys(d).map(function (k) { return k + "=" + encodeURIComponent(d[k]); }).join("&");
    var casa = (D.casas.find(function (c) { return c.id === d.casa; }) || {}).nombre || d.casa;
    var wa = "https://wa.me/" + D.whatsapp + "?text=" + encodeURIComponent("Mi evaluación de " + casa + " (" + d.estrellas + "/5): " + d.texto + " — " + d.nombre);
    function listo(enviado) {
      form.hidden = true; var g = $("#ev-gracias"); g.hidden = false;
      g.innerHTML = enviado ? "<h3>¡Gracias, " + esc(d.nombre.split(" ")[0]) + "!</h3><p>Recibimos tu evaluación. La revisamos y la publicamos en los próximos días.</p>"
        : "<h3>No pudimos enviarla desde aquí</h3><p>Mándanosla por WhatsApp y la publicamos nosotros:</p><a class=\"boton boton--terracota\" target=\"_blank\" rel=\"noopener\" href=\"" + wa + "\">Enviar por WhatsApp</a>";
    }
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: cuerpo })
      .then(function (r) { listo(r.ok); }).catch(function () { listo(false); });
  });

  pintarRanking();
})();
