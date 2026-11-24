(function () {
  var id = location.hash.slice(1), $ = function (i) { return document.getElementById(i); }, datos = null, tGuardar;
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function fallo(m) { $("cargando").hidden = true; $("error").textContent = m; $("error").hidden = false; }
  function pintar(d, animar) {
    var pase = $("pase");
    pase.dataset.tema = d.tema;
    if (animar) { pase.classList.remove("entra"); void pase.offsetWidth; pase.classList.add("entra"); }
    $("progreso").textContent = d.progreso; $("nombre").textContent = d.nombre; $("codigo").textContent = d.codigo;
    $("gratis").textContent = d.listo ? "¡Listo!" : "En " + (d.meta - d.sellos) + (d.meta - d.sellos === 1 ? " servicio" : " servicios");
    $("cumple").textContent = d.textoCumple; $("estado").textContent = d.estado;
    MR.franja($("franja"), d.sellos, d.meta, d.sello);
    [].forEach.call(document.querySelectorAll("#temas .opcion"), function (b) { b.setAttribute("aria-pressed", b.dataset.valor === d.tema); });
    [].forEach.call(document.querySelectorAll("#iconos .opcion"), function (b) { b.setAttribute("aria-pressed", b.dataset.valor === d.sello); });
  }
  function opciones() {
    $("temas").innerHTML = MR_TEMAS.map(function (t) {
      return '<button type="button" class="opcion" data-valor="' + t.id + '"><span class="muestra" data-tema="' + t.id + '"><i></i></span>' + t.nombre + "</button>";
    }).join("");
    $("iconos").innerHTML = MR_SELLOS.map(function (s) {
      return '<button type="button" class="opcion" data-valor="' + s + '" aria-label="' + MR_ICONOS[s].nombre + '"><span class="icono-op">' + MR_ICONO(s) + "</span>" + MR_ICONOS[s].nombre + "</button>";
    }).join("");
    $("temas").addEventListener("click", function (e) { var b = e.target.closest(".opcion"); if (b) cambiar({ tema: b.dataset.valor }); });
    $("iconos").addEventListener("click", function (e) { var b = e.target.closest(".opcion"); if (b) cambiar({ sello: b.dataset.valor }); });
  }
  function cambiar(c) {
    if (!datos) return;
    var nuevo = Object.assign({}, datos, c), cambioIcono = c.sello && c.sello !== datos.sello;
    datos = nuevo; pintar(datos, cambioIcono);
    $("guardado").textContent = "Guardando…";
    clearTimeout(tGuardar);
    tGuardar = setTimeout(function () {
      MR.api("/lealtad/api/tarjeta", { accion: "personalizar", id: datos.id, tema: datos.tema, sello: datos.sello }).then(function (d) {
        if (d._estado >= 400) throw new Error(d.error || "No se pudo guardar.");
        $("guardado").innerHTML = CHECK + "Guardado. Tu Wallet se actualizará en unos momentos.";
      }).catch(function (e) { $("guardado").textContent = e.message || "Sin conexión. Intenta de nuevo."; });
    }, 450);
  }
  if (!/^[\w-]{20,40}$/.test(id)) return fallo("Enlace de tarjeta inválido.");
  opciones();
  fetch("/lealtad/api/tarjeta?id=" + encodeURIComponent(id)).then(function (r) { return r.json().then(function (d) { return [r.ok, d]; }); })
    .then(function (x) {
      var d = x[1]; if (!x[0]) return fallo(d.error || "No encontramos tu tarjeta.");
      datos = d;
      var qr = qrcode(0, "M"); qr.addData(location.origin + "/lealtad/panel.html#" + d.id); qr.make();
      $("qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      if (d.apple) { $("apple").href = "/lealtad/api/apple/pase?id=" + encodeURIComponent(d.id); $("apple").hidden = false; }
      if (d.google) { $("google").href = "/lealtad/api/google?id=" + encodeURIComponent(d.id); $("google").hidden = false; }
      if (d.regalo) { $("regalo-x").textContent = d.regalo.texto + " en tu cumpleaños. Muestra esta tarjeta en el taller. Válido hasta el " + d.regalo.vence + "."; $("regalo").hidden = false; }
      if (d.promo) { $("promo-t").textContent = d.promo.titulo; $("promo-x").textContent = d.promo.texto; $("promo").hidden = false; }
      if (/nueva=1/.test(location.search)) $("nueva").hidden = false;
      $("cargando").hidden = true; $("vista").hidden = false;
      pintar(d, true);
    }).catch(function () { fallo("Sin conexión. Intenta de nuevo."); });
})();
