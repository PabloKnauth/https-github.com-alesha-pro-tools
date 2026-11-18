/* Trae los datos que el administrador editó (/api/publico), los combina con casas.js
   y después arranca la página. Si el servidor no responde, usa los archivos estáticos. */
(function () {
  "use strict";
  var MM = window.MM;
  function arrancar() {
    // Defensa extra: en la página pública nunca se muestran textos de 1–2 estrellas.
    var ev = window.MM_EVAL || {};
    Object.keys(ev).forEach(function (k) { ev[k] = (ev[k] || []).filter(function (e) { return +e.estrellas >= 3; }); });
    ["assets/js/extras.js", "assets/js/app.js"].reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (ok) { var s = document.createElement("script"); s.src = src; s.onload = s.onerror = ok; document.body.appendChild(s); });
      });
    }, Promise.resolve());
  }
  function combinar(d) {
    var cambios = d.casas || {};
    MM.casas = MM.casas.map(function (c) {
      var o = cambios[c.id]; if (!o) return c;
      var n = Object.assign({}, c);
      Object.keys(o).forEach(function (k) { if (o[k] !== undefined) n[k] = o[k]; });
      return n;
    }).filter(function (c) { return !c.oculta; });
    MM.casas.forEach(function (c) { c.ocupada = (d.ocupada && d.ocupada[c.id]) || []; });
    MM.calendarioAlDia = !!(d.config && d.config.mostrarDisponibilidad);
    window.MM_EVAL = d.evaluaciones || {};
    window.MM_RESUMEN = d.resumenes || null;
    window.MM_ATRACTIVOS = d.atractivos || [];
    window.MM_LUGARES = d.lugares || [];
  }
  var listo = false, tiempo = setTimeout(function () { if (!listo) { listo = true; arrancar(); } }, 3000);
  if (!window.fetch || location.protocol === "file:") { clearTimeout(tiempo); listo = true; arrancar(); return; }
  fetch("/api/publico", { headers: { accept: "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { if (listo) return; combinar(d); })
    .catch(function () {})
    .then(function () { if (!listo) { listo = true; clearTimeout(tiempo); arrancar(); } });
})();
