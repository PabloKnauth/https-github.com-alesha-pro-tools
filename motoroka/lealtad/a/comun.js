window.MR = {
  pasos: function (el, n, meta) {
    el.textContent = "";
    for (var i = 1; i <= meta + 1; i++) {
      var c = document.createElement("i");
      c.textContent = i > meta ? "GRATIS" : i;
      if (i > meta) c.className = "regalo" + (n >= meta ? " lleno" : "");
      else if (i <= n) c.className = "lleno";
      el.appendChild(c);
    }
  },
  api: function (ruta, cuerpo) {
    return fetch(ruta, cuerpo ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo), credentials: "same-origin" } : { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._estado = r.status; return d; }); });
  },
};
