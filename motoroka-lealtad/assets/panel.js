(function () {
  var $ = function (i) { return document.getElementById(i); }, actual = null, t0;
  function msg(m, malo) { var e = $("msg"); e.textContent = m; e.className = "aviso " + (malo ? "error" : "ok"); e.hidden = false; clearTimeout(t0); t0 = setTimeout(function () { e.hidden = true; }, 5000); }
  function vista(on) { $("entrar").hidden = on; $("app").hidden = !on; }
  function pedir(cuerpo) {
    return MR.api("/api/panel", cuerpo).then(function (d) {
      if (d._estado === 401 && cuerpo.accion !== "entrar") { vista(false); throw new Error("Tu sesión venció. Vuelve a entrar."); }
      if (d._estado >= 400) throw new Error(d.error || "Error.");
      return d;
    });
  }
  function ficha(d) {
    actual = d; $("ficha").hidden = false;
    $("f-nombre").textContent = d.nombre + " · " + d.codigo;
    $("f-estado").textContent = d.estado + (d.canjes ? " · " + d.canjes + " canje(s)" : "");
    MR.pasos($("f-pasos"), d.sellos, d.meta);
    $("sellar").disabled = d.listo; $("canjear").disabled = !d.listo; $("quitar").disabled = !d.sellos;
    $("f-wa").href = "https://wa.me/52" + d.tel + "?text=" + encodeURIComponent("Hola " + d.nombre + ", esta es tu tarjeta de lealtad de Moto Roka: " + location.origin + "/tarjeta.html#" + d.id);
    var h = $("f-hist"); h.textContent = "";
    d.historial.slice().reverse().forEach(function (x) { var li = document.createElement("li"); li.textContent = new Date(x.t).toLocaleString("es-MX") + " — " + x.tipo; h.appendChild(li); });
  }
  function buscar(q) { return pedir({ accion: "buscar", q: q }).then(ficha).catch(function (e) { msg(e.message, true); }); }
  function accion(a, texto) {
    if (!actual) return;
    pedir({ accion: a, id: actual.id }).then(function (d) { ficha(d); msg(texto); }).catch(function (e) { msg(e.message, true); });
  }
  $("entrar").addEventListener("submit", function (e) {
    e.preventDefault();
    pedir({ accion: "entrar", clave: e.target.clave.value }).then(function () { e.target.reset(); vista(true); inicio(); }).catch(function (x) { msg(x.message, true); });
  });
  $("buscar").addEventListener("submit", function (e) { e.preventDefault(); buscar(e.target.q.value); });
  $("sellar").addEventListener("click", function () { accion("sellar", "Sello agregado. El cliente recibirá el aviso en su Wallet."); });
  $("canjear").addEventListener("click", function () { if (confirm("¿Canjear el Servicio Express gratis de " + actual.nombre + "?")) accion("canjear", "Canje registrado. La tarjeta vuelve a 0."); });
  $("quitar").addEventListener("click", function () { if (confirm("¿Quitar un sello?")) accion("quitar", "Sello quitado."); });
  $("promo").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!confirm("Se enviará un aviso a todos los clientes con la tarjeta en su Wallet. ¿Continuar?")) return;
    pedir({ accion: "promo", titulo: e.target.titulo.value, texto: e.target.texto.value }).then(function (d) {
      e.target.reset();
      msg("Promoción publicada." + (d.apple && d.apple.enviados != null ? " iPhone avisados: " + d.apple.enviados + "." : "") + (d.google === 200 ? " Google Wallet: enviada." : ""));
    }).catch(function (x) { msg(x.message, true); });
  });
  $("salir").addEventListener("click", function (e) { e.preventDefault(); pedir({ accion: "salir" }).finally(function () { vista(false); }); });
  function inicio() { var id = location.hash.slice(1); if (id) { buscar(id); history.replaceState(null, "", location.pathname); } }
  pedir({ accion: "estado" }).then(function () { vista(true); inicio(); }).catch(function () { vista(false); });
})();
