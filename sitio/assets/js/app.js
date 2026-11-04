(function () {
  "use strict";
  var M = window.MARCA || {};
  var R = (window.RECURSOS || []).slice().sort(function (a, b) { return a.orden - b.orden; });
  var CLAVE = "biblioteca-desbloqueada-v1";
  var $ = function (s, el) { return (el || document).querySelector(s); };

  /* ---------- almacenamiento seguro ---------- */
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var desbloqueado = leer(CLAVE) === "1";

  /* ---------- colores de portada ---------- */
  var PALETA = {
    tomato: ["var(--tomato)", "var(--pink)", "var(--mustard)"],
    pink: ["var(--pink)", "var(--mustard)", "var(--tomato)"],
    mustard: ["var(--mustard)", "var(--tomato)", "var(--pink)"],
    moss: ["var(--moss)", "var(--mustard)", "var(--pink)"]
  };
  function ondas(color) {
    var c = PALETA[color] || PALETA.tomato;
    return '<svg class="ondas" viewBox="0 0 400 170" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect width="400" height="170" fill="' + c[0] + '"/>' +
      '<path fill="' + c[1] + '" d="M0 96 C70 60 120 140 200 104 S330 50 400 92 L400 170 L0 170 Z"/>' +
      '<path fill="' + c[2] + '" d="M0 132 C80 104 140 168 220 138 S340 110 400 134 L400 170 L0 170 Z"/>' +
      '<path fill="' + c[1] + '" opacity=".55" d="M250 0 C300 30 280 70 340 80 S400 40 400 0 Z"/></svg>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- tarjetas ---------- */
  var filtro = "Todos", texto = "";
  var tipos = ["Todos"].concat(R.map(function (r) { return r.tipo; }).filter(function (t, i, a) { return a.indexOf(t) === i; }));

  function pintarChips() {
    $("#chips").innerHTML = tipos.map(function (t) {
      return '<button class="chip" type="button" aria-pressed="' + (t === filtro) + '" data-t="' + esc(t) + '">' + esc(t) + "</button>";
    }).join("");
  }

  function tarjeta(r) {
    var meta = ["<li>" + esc(r.nivel) + "</li>", "<li>" + r.minutos + " min</li>"];
    if (r.prompts >= 3) meta.push("<li>" + r.prompts + " prompts</li>");
    if (r.paginas) meta.push("<li>PDF · " + r.paginas + " págs</li>");
    var acciones = desbloqueado
      ? '<a class="btn btn--sm" href="recursos/' + r.slug + '.html">Leer</a>' +
        '<a class="btn btn--sm btn--ghost" href="recursos/pdf/' + r.slug + '.pdf" download>Descargar PDF</a>'
      : '<button class="btn btn--sm btn--tomato" type="button" data-abrir="' + r.slug + '">Desbloquear gratis</button>';
    var onC = r.color === "moss" ? "var(--on-moss)" : "var(--on-color)";
    return '<article class="tarjeta" style="--c:var(--' + r.color + ');--on-c:' + onC + '">' +
      '<div class="tarjeta__portada">' + ondas(r.color) +
        '<span class="tarjeta__tipo">' + esc(r.tipo) + "</span>" +
        (desbloqueado ? "" : '<span class="tarjeta__candado" title="Bloqueado"><svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>') +
        '<svg class="tarjeta__garabato" viewBox="0 0 100 100" aria-hidden="true"><use class="doodle" href="#g-' + r.garabato + '"/></svg>' +
      "</div>" +
      '<div class="tarjeta__cuerpo">' +
        '<h3 class="tarjeta__t">' + esc(r.titulo) + "</h3>" +
        '<p class="tarjeta__d">' + esc(r.subtitulo) + "</p>" +
        '<ul class="tarjeta__meta">' + meta.join("") + "</ul>" +
        '<div class="tarjeta__acciones">' + acciones + "</div>" +
      "</div></article>";
  }

  function pintar() {
    var q = texto.trim().toLowerCase();
    var lista = R.filter(function (r) {
      var okT = filtro === "Todos" || r.tipo === filtro;
      var okQ = !q || (r.titulo + " " + r.subtitulo + " " + r.tipo + " " + (r.claves || "")).toLowerCase().indexOf(q) > -1;
      return okT && okQ;
    });
    $("#rejilla").innerHTML = lista.map(tarjeta).join("");
    $("#vacio").hidden = lista.length > 0;
  }

  $("#chips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return;
    filtro = b.getAttribute("data-t"); pintarChips(); pintar();
  });
  $("#buscar").addEventListener("input", function (e) { texto = e.target.value; pintar(); });

  /* ---------- modal de desbloqueo ---------- */
  var modal = $("#modal"), btnSeguir = $("#btn-seguir"), btnDes = $("#btn-desbloquear");
  var pendiente = null, temporizador = null;

  function abrir(slug) {
    pendiente = slug;
    var r = R.filter(function (x) { return x.slug === slug; })[0];
    $("#modal-recurso").textContent = r ? "para abrir: " + r.titulo.toLowerCase() : "desbloquea la biblioteca";
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-abrir]"); if (b) abrir(b.getAttribute("data-abrir"));
  });

  btnSeguir.addEventListener("click", function () {
    var s = Math.max(0, Number(M.esperaSeguir) || 0);
    clearInterval(temporizador);
    function tic() {
      if (s <= 0) { clearInterval(temporizador); btnDes.disabled = false; btnDes.textContent = "Ya te sigo · desbloquear"; btnDes.classList.add("btn--mustard"); return; }
      btnDes.textContent = "Disponible en " + s + " s"; s -= 1;
    }
    tic(); temporizador = setInterval(tic, 1000);
  });

  function enviarCorreo(correo) {
    if (!correo) return;
    var datos = { email: correo, recurso: pendiente || "" };
    try {
      if (M.formEndpoint) {
        fetch(M.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(datos) }).catch(function () {});
      } else {
        var cuerpo = "form-name=desbloqueo&email=" + encodeURIComponent(datos.email) + "&recurso=" + encodeURIComponent(datos.recurso);
        fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: cuerpo }).catch(function () {});
      }
    } catch (e) {}
  }

  btnDes.addEventListener("click", function () {
    var correo = $("#correo").value.trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      aviso("Revisa tu correo: falta la @ o el dominio. También puedes dejarlo vacío.");
      $("#correo").focus(); return;
    }
    enviarCorreo(correo);
    desbloqueado = true; guardar(CLAVE, "1");
    modal.close ? modal.close() : modal.removeAttribute("open");
    pintar();
    aviso("Biblioteca desbloqueada. Gracias por seguirme.");
    if (pendiente) setTimeout(function () { location.href = "recursos/" + pendiente + ".html"; }, 900);
  });

  /* ---------- aviso ---------- */
  var tToast;
  function aviso(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(tToast); tToast = setTimeout(function () { t.hidden = true; }, 3200);
  }

  /* ---------- tienda ---------- */
  $("#productos").innerHTML = (M.productos || []).map(function (p) {
    var boton = p.enlace
      ? '<a class="btn btn--' + p.color + '" href="' + esc(p.enlace) + '" target="_blank" rel="noopener">Comprar</a>'
      : '<button class="btn btn--ghost" type="button" disabled>Muy pronto</button>';
    return '<article class="producto" style="--c:var(--' + p.color + ')">' +
      (p.etiqueta ? '<span class="producto__etq">' + esc(p.etiqueta) + "</span>" : "") +
      '<h3 class="producto__n">' + esc(p.nombre) + "</h3>" +
      '<p class="producto__p">' + esc(p.precio) + "</p>" +
      '<p class="producto__r">' + esc(p.resumen) + "</p>" +
      "<ul>" + (p.incluye || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" +
      boton + "</article>";
  }).join("");

  /* ---------- sobre mí, redes, contadores ---------- */
  $("#sobre-texto").innerHTML = (M.sobreMi || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  var redes = [];
  if (M.instagram) redes.push(["Instagram", "https://instagram.com/" + M.instagram]);
  if (M.kick) redes.push(["Kick", "https://kick.com/" + M.kick]);
  if (M.tiktok) redes.push(["TikTok", "https://www.tiktok.com/@" + M.tiktok]);
  if (M.youtube) redes.push(["YouTube", M.youtube]);
  $("#redes").innerHTML = redes.map(function (r) { return '<li><a href="' + esc(r[1]) + '" target="_blank" rel="noopener">' + r[0] + "</a></li>"; }).join("") +
    (M.correo ? "<li>" + esc(M.correo) + "</li>" : "");
  $("#anio").textContent = new Date().getFullYear();
  var nP = R.reduce(function (s, r) { return s + (r.prompts || 0); }, 0);
  var cR = $('[data-count="recursos"]'), cP = $('[data-count="prompts"]');
  if (cR) cR.textContent = R.length;
  if (cP) cP.textContent = nP;

  pintarChips(); pintar();
  var abrirSlug = new URLSearchParams(location.search).get("r");
  if (abrirSlug && !desbloqueado) abrir(abrirSlug);
})();
