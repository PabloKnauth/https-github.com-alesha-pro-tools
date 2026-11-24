(function () {
  var id = location.hash.slice(1), $ = function (i) { return document.getElementById(i); };
  function fallo(m) { $("cargando").hidden = true; $("error").textContent = m; $("error").hidden = false; }
  if (!/^[\w-]{20,40}$/.test(id)) return fallo("Enlace de tarjeta inválido.");
  fetch("/api/tarjeta?id=" + encodeURIComponent(id)).then(function (r) { return r.json().then(function (d) { return [r.ok, d]; }); })
    .then(function (x) {
      var d = x[1]; if (!x[0]) return fallo(d.error || "No encontramos tu tarjeta.");
      $("codigo").textContent = d.codigo; $("nombre").textContent = d.nombre; $("estado").textContent = d.estado;
      MR.pasos($("pasos"), d.sellos, d.meta);
      var qr = qrcode(0, "M"); qr.addData(location.origin + "/panel.html#" + d.id); qr.make();
      $("qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      if (d.apple) { $("apple").href = "/api/apple/pase?id=" + encodeURIComponent(d.id); $("apple").hidden = false; }
      if (d.google) { $("google").href = "/api/google?id=" + encodeURIComponent(d.id); $("google").hidden = false; }
      if (d.promo) { $("promo-t").textContent = d.promo.titulo; $("promo-x").textContent = d.promo.texto; $("promo").hidden = false; }
      if (/nueva=1/.test(location.search)) $("nueva").hidden = false;
      $("cargando").hidden = true; $("vista").hidden = false;
    }).catch(function () { fallo("Sin conexión. Intenta de nuevo."); });
})();
