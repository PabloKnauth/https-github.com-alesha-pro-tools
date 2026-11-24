(function () {
  var f = document.getElementById("alta"), err = document.getElementById("error");
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var b = f.querySelector("button"); b.disabled = true; err.hidden = true;
    fetch("/api/tarjeta", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: f.nombre.value, tel: f.tel.value, acepto: f.acepto.checked, sitio: f.sitio.value }) })
      .then(function (r) { return r.json().then(function (d) { return [r.ok, d]; }); })
      .then(function (x) {
        if (!x[0]) throw new Error(x[1].error || "No se pudo crear la tarjeta.");
        location.href = "/tarjeta.html?nueva=1#" + x[1].id;
      })
      .catch(function (e) { err.textContent = e.message || "Sin conexión. Intenta de nuevo."; err.hidden = false; b.disabled = false; });
  });
})();
