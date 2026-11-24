(function () {
  var f = document.getElementById("alta"), err = document.getElementById("error");
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var b = f.querySelector("button[type=submit]"); err.hidden = true;
    if (!f.dia.value !== !f.mes.value) { err.textContent = "Elige día y mes de tu cumpleaños, o deja ambos vacíos."; err.hidden = false; return; }
    b.disabled = true;
    fetch("/lealtad/api/tarjeta", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: f.nombre.value, tel: f.tel.value, acepto: f.acepto.checked, sitio: f.sitio.value, cumple: f.dia.value && f.mes.value ? f.dia.value + "/" + f.mes.value : "" }) })
      .then(function (r) { return r.json().then(function (d) { return [r.ok, d]; }); })
      .then(function (x) {
        if (!x[0]) throw new Error(x[1].error || "No se pudo crear la tarjeta.");
        location.href = "/lealtad/tarjeta.html?nueva=1#" + x[1].id;
      })
      .catch(function (e) { err.textContent = e.message || "Sin conexión. Intenta de nuevo."; err.hidden = false; b.disabled = false; });
  });
})();
