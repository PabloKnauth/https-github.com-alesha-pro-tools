window.MR = {
  // Franja de sellos: 4 sellos con el icono elegido + la casilla del servicio gratis.
  franja: function (el, n, meta, sello) {
    var h = "";
    for (var i = 0; i <= meta; i++) {
      var regalo = i === meta, lleno = regalo ? n >= meta : i < n;
      h += '<span class="casilla' + (regalo ? " regalo" : "") + (lleno ? " lleno" : "") + '" style="--i:' + i + '">' +
        (regalo ? '<svg class="anillo" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48.5"/></svg>' : "") +
        MR_ICONO(regalo ? "regalo" : sello) + "</span>";
    }
    el.innerHTML = h;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", Math.min(n, meta) + " de " + meta + " sellos" + (n >= meta ? ", servicio gratis disponible" : ""));
  },
  api: function (ruta, cuerpo) {
    return fetch(ruta, cuerpo ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo), credentials: "same-origin" } : { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._estado = r.status; return d; }); });
  },
};
